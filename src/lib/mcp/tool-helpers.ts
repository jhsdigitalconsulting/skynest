import { z } from 'zod';
import type { McpServer, ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { McpExtra } from './auth';

export function jsonResult(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function textResult(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

export function getExtra(authInfo: unknown): McpExtra {
  return (authInfo as { extra: McpExtra }).extra;
}

export function requireWriteScope(
  authInfo: unknown,
): { content: [{ type: 'text'; text: string }]; isError: true } | null {
  const scopes: string[] = (authInfo as { scopes?: string[] })?.scopes ?? [];
  if (!scopes.includes('mcp:write')) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error:
              'Insufficient permissions: this account has read-only access to this vault. Write access is required.',
          }),
        },
      ],
      isError: true,
    };
  }
  return null;
}

/**
 * The vault this call is addressing. Doubles as the default `server_alias`:
 * absent a client-side name, the vault id is the best guess at what the caller
 * configured this server as.
 */
export function resolveVaultId(extra: McpExtra): string {
  return extra.vaultId ?? process.env.CONTEXTNEST_DEFAULT_VAULT_ID ?? 'default';
}

export function errorResult(message: string) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify({ error: message }, null, 2) }],
    isError: true as const,
  };
}

// ─── Strict tool registration ─────────────────────────────────────────────────

export type ToolCtx = Parameters<ToolCallback<z.ZodRawShape>>[1];

/**
 * Register a tool whose input schema *rejects* unknown properties.
 *
 * `McpServer.tool(name, desc, rawShape, cb)` wraps the shape in a plain
 * `z.object()`, and a plain `z.object()` strips unknown keys rather than
 * failing on them — even though the JSON Schema we advertise to clients says
 * `additionalProperties: false`. A caller that misnames an argument therefore
 * validates cleanly and the handler runs as though the argument was never
 * passed. On the write tools that is data loss wearing a success message:
 * `update_document({ path, content })` (the body parameter is `body`) publishes
 * a new version, a checkpoint and a chain entry with the body untouched, and
 * reports "Document updated and published successfully".
 *
 * Registering `.strict()` makes the server enforce the contract it publishes,
 * so a misnamed argument fails as an InvalidParams error instead.
 */
export function makeToolRegistrar(server: McpServer) {
  return function tool<Shape extends z.ZodRawShape>(
    name: string,
    description: string,
    shape: Shape,
    handler: (
      args: z.output<z.ZodObject<Shape>>,
      ctx: ToolCtx,
    ) => CallToolResult | Promise<CallToolResult>,
  ): void {
    server.registerTool(
      name,
      { description, inputSchema: z.object(shape).strict() },
      handler as ToolCallback<z.ZodObject<Shape, 'strict'>>,
    );
  };
}


export type ToolRegistrar = ReturnType<typeof makeToolRegistrar>;
