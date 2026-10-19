import type { NestConfig } from '@promptowl/contextnest-engine';

/** The agent config files `ctx index` can write, by the tool ids config.yaml uses. */
export const AGENT_TOOLS = [
  { id: 'claude', label: 'Claude', file: 'CLAUDE.md' },
  { id: 'gemini', label: 'Gemini', file: 'GEMINI.md' },
  { id: 'cursor', label: 'Cursor', file: '.cursorrules' },
  { id: 'windsurf', label: 'Windsurf', file: '.windsurfrules' },
  { id: 'copilot', label: 'GitHub Copilot', file: '.github/copilot-instructions.md' },
] as const;

export interface FolderSetting {
  path: string;
  description: string;
  /** Id of the document new documents in this folder start from; empty for none. */
  template: string;
}

/** The parts of .context/config.yaml that Settings edits. */
export interface VaultSettingsInput {
  name: string;
  description: string;
  folders: FolderSetting[];
  /** Tool ids to write config files for. Every tool selected is saved as "all" (the key is left out). */
  agentTools: string[];
  /** Empty means the built-in directive. */
  directive: string;
}

export const NAME_MAX = 80;

/** What the form starts from. A config without agent_tools writes every tool's file. */
export function settingsFromConfig(config: NestConfig | null, folders: string[]): VaultSettingsInput {
  const configured = config?.folders ?? {};
  const paths = [...new Set([...folders, ...Object.keys(configured)])].sort();
  return {
    name: config?.name?.trim() ?? '',
    description: config?.description?.trim() ?? '',
    folders: paths.map((path) => ({
      path,
      description: configured[path]?.description ?? '',
      template: configured[path]?.template ?? '',
    })),
    agentTools: config?.agent_tools ?? AGENT_TOOLS.map((t) => t.id),
    directive: config?.agent_maintenance_directive ?? '',
  };
}

/**
 * Merge edited settings into the existing config. Everything Settings doesn't
 * edit (version, defaults, servers, sync, unknown keys) is kept as it was.
 */
export function applySettings(
  config: NestConfig | null,
  input: VaultSettingsInput,
  docIds: Set<string>,
): { ok: true; config: NestConfig } | { ok: false; error: string } {
  const name = input.name.trim();
  if (!name) return { ok: false, error: 'Give the vault a name.' };
  if (name.length > NAME_MAX) return { ok: false, error: `Keep the vault name to ${NAME_MAX} characters or fewer.` };

  const known = new Set<string>(AGENT_TOOLS.map((t) => t.id));
  const unknownTool = input.agentTools.find((t) => !known.has(t));
  if (unknownTool) return { ok: false, error: `Unknown agent tool “${unknownTool}”.` };

  const folders: Record<string, { description?: string; template?: string }> = {};
  for (const f of input.folders) {
    const description = f.description.trim();
    const template = f.template.trim();
    if (template && !docIds.has(template)) {
      return { ok: false, error: `The template for ${f.path} (“${template}”) isn’t a document in this vault.` };
    }
    if (description || template) {
      folders[f.path] = { ...(description ? { description } : {}), ...(template ? { template } : {}) };
    }
  }

  const next: NestConfig = { ...(config ?? { version: 1 }), name };
  setOptional(next, 'description', input.description.trim());
  setOptional(next, 'agent_maintenance_directive', input.directive.trim());
  if (Object.keys(folders).length) next.folders = folders;
  else delete next.folders;
  const tools = AGENT_TOOLS.map((t) => t.id).filter((id) => input.agentTools.includes(id));
  if (tools.length === AGENT_TOOLS.length) delete next.agent_tools;
  else next.agent_tools = tools;
  return { ok: true, config: next };
}

function setOptional(config: NestConfig, key: 'description' | 'agent_maintenance_directive', value: string) {
  if (value) config[key] = value;
  else delete config[key];
}
