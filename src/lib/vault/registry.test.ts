import { describe, it, expect, afterEach } from 'vitest';
import { envForVault, findVault, getDefaultVaultId, listVaults } from './registry.js';

const KEYS = [
  'CONTEXTNEST_VAULTS',
  'CONTEXTNEST_DEFAULT_VAULT_ID',
  'CONTEXTNEST_VAULT_LABEL',
  'CONTEXTNEST_VAULT_PATH',
  'CONTEXTNEST_VAULT_PATH_OH',
  'CONTEXTNEST_VAULT_PATH_MY_VAULT',
];

describe('vault registry', () => {
  afterEach(() => {
    for (const key of KEYS) delete process.env[key];
  });

  it('serves a single "default" vault when nothing is configured', () => {
    expect(listVaults()).toEqual([{ id: 'default', label: 'Default' }]);
    expect(getDefaultVaultId()).toBe('default');
  });

  it('uses CONTEXTNEST_DEFAULT_VAULT_ID and CONTEXTNEST_VAULT_LABEL for the single vault', () => {
    process.env.CONTEXTNEST_DEFAULT_VAULT_ID = 'oh';
    process.env.CONTEXTNEST_VAULT_LABEL = 'Acme Corp';
    expect(listVaults()).toEqual([{ id: 'oh', label: 'Acme Corp' }]);
  });

  it('parses CONTEXTNEST_VAULTS id:Label pairs, title-casing missing labels', () => {
    process.env.CONTEXTNEST_VAULTS = ' oh:Acme Corp , jhs-dc ,';
    expect(listVaults()).toEqual([
      { id: 'oh', label: 'Acme Corp' },
      { id: 'jhs-dc', label: 'Jhs Dc' },
    ]);
  });

  it('rejects invalid vault ids', () => {
    process.env.CONTEXTNEST_VAULTS = '../etc:Bad';
    expect(() => listVaults()).toThrow('Invalid vaultId');
  });

  it('defaults to CONTEXTNEST_DEFAULT_VAULT_ID only when it is listed', () => {
    process.env.CONTEXTNEST_VAULTS = 'oh:Acme Corp,jhsdc:JHSDC';
    process.env.CONTEXTNEST_DEFAULT_VAULT_ID = 'jhsdc';
    expect(getDefaultVaultId()).toBe('jhsdc');
    process.env.CONTEXTNEST_DEFAULT_VAULT_ID = 'missing';
    expect(getDefaultVaultId()).toBe('oh');
  });

  it('finds listed vaults only', () => {
    process.env.CONTEXTNEST_VAULTS = 'oh:Acme Corp';
    expect(findVault('oh')).toEqual({ id: 'oh', label: 'Acme Corp' });
    expect(findVault('jhsdc')).toBeNull();
  });

  it('prefers the per-vault env var over the bare one', () => {
    process.env.CONTEXTNEST_VAULT_PATH = '/shared';
    process.env.CONTEXTNEST_VAULT_PATH_OH = '/oh';
    process.env.CONTEXTNEST_VAULT_PATH_MY_VAULT = '/mine';
    expect(envForVault('CONTEXTNEST_VAULT_PATH', 'oh')).toBe('/oh');
    expect(envForVault('CONTEXTNEST_VAULT_PATH', 'my-vault')).toBe('/mine');
    expect(envForVault('CONTEXTNEST_VAULT_PATH', 'other')).toBe('/shared');
  });
});
