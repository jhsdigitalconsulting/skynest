import { describe, expect, it } from 'vitest';
import type { NestConfig } from '@promptowl/contextnest-engine';
import { AGENT_TOOLS, applySettings, settingsFromConfig } from './vault-settings';
import type { VaultSettingsInput } from './vault-settings';

const ALL_TOOLS = AGENT_TOOLS.map((t) => t.id);

function input(overrides: Partial<VaultSettingsInput> = {}): VaultSettingsInput {
  return { name: 'Vault', description: '', folders: [], agentTools: [...ALL_TOOLS], directive: '', ...overrides };
}

describe('settingsFromConfig', () => {
  it('lists existing and configured folders, and treats a missing agent_tools as every tool', () => {
    const config: NestConfig = { version: 1, name: ' MarTech ', folders: { 'nodes/old': { description: 'Old' } } };
    const s = settingsFromConfig(config, ['nodes/new']);
    expect(s.name).toBe('MarTech');
    expect(s.folders).toEqual([
      { path: 'nodes/new', description: '', template: '' },
      { path: 'nodes/old', description: 'Old', template: '' },
    ]);
    expect(s.agentTools).toEqual(ALL_TOOLS);
  });

  it('starts empty when the vault has no config', () => {
    expect(settingsFromConfig(null, [])).toEqual(input({ name: '' }));
  });
});

describe('applySettings', () => {
  it('keeps the settings it does not edit', () => {
    const config: NestConfig = {
      version: 2,
      name: 'Old',
      servers: { mcp: { url: 'https://x', transport: 'mcp' } },
      sync: { auto_index: true },
      defaults: { status: 'draft' },
    };
    const r = applySettings(config, input({ name: ' New ' }), new Set());
    expect(r).toEqual({ ok: true, config: { ...config, name: 'New' } });
  });

  it('creates a version 1 config for a vault without one', () => {
    expect(applySettings(null, input(), new Set())).toEqual({ ok: true, config: { version: 1, name: 'Vault' } });
  });

  it('drops cleared optional fields and empty folder rows', () => {
    const config: NestConfig = {
      version: 1,
      name: 'V',
      description: 'd',
      agent_maintenance_directive: 'x',
      folders: { a: { description: 'A' } },
    };
    const r = applySettings(config, input({ folders: [{ path: 'a', description: ' ', template: '' }] }), new Set());
    expect(r).toEqual({ ok: true, config: { version: 1, name: 'Vault' } });
  });

  it('saves folder settings and a subset of agent tools', () => {
    const r = applySettings(
      null,
      input({
        folders: [{ path: 'nodes/faq', description: ' FAQs ', template: 'nodes/faq/template' }],
        agentTools: ['copilot', 'claude'],
      }),
      new Set(['nodes/faq/template']),
    );
    expect(r).toEqual({
      ok: true,
      config: {
        version: 1,
        name: 'Vault',
        folders: { 'nodes/faq': { description: 'FAQs', template: 'nodes/faq/template' } },
        agent_tools: ['claude', 'copilot'],
      },
    });
  });

  it('rejects a missing name, an unknown template and an unknown tool', () => {
    expect(applySettings(null, input({ name: ' ' }), new Set()).ok).toBe(false);
    expect(applySettings(null, input({ name: 'x'.repeat(81) }), new Set()).ok).toBe(false);
    expect(
      applySettings(null, input({ folders: [{ path: 'a', description: '', template: 'gone' }] }), new Set()).ok,
    ).toBe(false);
    expect(applySettings(null, input({ agentTools: ['emacs'] }), new Set()).ok).toBe(false);
  });
});
