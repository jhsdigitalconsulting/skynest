import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/vault/registry', () => ({ envForVault: (k: string) => process.env[k] }));
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('./context', () => ({}));
vi.mock('@/lib/review', () => ({ listDrafts: vi.fn() }));

import { effectiveRoot, uiRootFor, visibleNodes } from './content-root';
import { buildFolderTree } from './data';

const ids = (...xs: string[]) => xs.map((id) => ({ id }));

describe('visibleNodes', () => {
  const nodes = ids('nodes/a/x', 'nodes/b/y', '_sync/backup/r/nodes/a/x', '.github/README', 'tests/t');

  it('keeps only content under the root and drops bookkeeping', () => {
    expect(visibleNodes(nodes, 'nodes').map((n) => n.id)).toEqual(['nodes/a/x', 'nodes/b/y']);
  });

  it('falls back to all content (still hiding bookkeeping) when nothing is under the root', () => {
    const v = visibleNodes(ids('docs/a', '_sync/b'), 'nodes');
    expect(v.map((n) => n.id)).toEqual(['docs/a']);
    expect(effectiveRoot(v, 'nodes')).toBe('');
  });

  it('shows everything but bookkeeping when the root is empty', () => {
    expect(visibleNodes(nodes, '').length).toBe(4);
  });

  it('reads the root from env, defaulting to nodes; "/" means no root', () => {
    delete process.env.VAULT_UI_ROOT;
    expect(uiRootFor('v')).toBe('nodes');
    process.env.VAULT_UI_ROOT = '/';
    expect(uiRootFor('v')).toBe('');
    delete process.env.VAULT_UI_ROOT;
  });
});

describe('buildFolderTree with a root', () => {
  it('promotes the root children to the top level but keeps full paths', () => {
    const tree = buildFolderTree(
      [{ folder: 'nodes/ontology/core' }, { folder: 'nodes/ontology' }, { folder: 'nodes/state' }, { folder: 'nodes' }],
      'nodes',
    );
    expect(tree.count).toBe(4);
    expect(tree.children.map((c) => [c.name, c.path, c.count])).toEqual([
      ['ontology', 'nodes/ontology', 2],
      ['state', 'nodes/state', 1],
    ]);
    expect(tree.children[0].children[0].path).toBe('nodes/ontology/core');
  });

  it('is unchanged without a root', () => {
    const tree = buildFolderTree([{ folder: 'a/b' }]);
    expect(tree.children[0]).toMatchObject({ name: 'a', path: 'a' });
  });
});
