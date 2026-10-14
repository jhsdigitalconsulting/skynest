'use client';

import Link from 'next/link';
import { EmptyState } from '@/components/vault/EmptyState';
import { buttonClass } from '@/components/vault/button-styles';
import { PAGE_CONTAINER } from '@/components/vault/layout-styles';
import { useVaultUrls } from '@/components/vault/useVault';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

/** Keeps the vault header in place when a page fails to load, with a way to retry. */
export default function VaultError({ error, reset }: Props) {
  const urls = useVaultUrls();
  return (
    <div className={`${PAGE_CONTAINER} py-10`}>
      <EmptyState
        icon="alert"
        title="This page couldn’t be loaded"
        action={
          <div className="flex gap-2">
            <button type="button" onClick={reset} className={buttonClass('primary')}>
              Try again
            </button>
            <Link href={urls.browse()} className={buttonClass('secondary')}>
              All documents
            </Link>
          </div>
        }
      >
        Something went wrong reading the vault. It’s usually temporary, so try again in a moment.
        {error.digest ? ` (Reference: ${error.digest})` : ''}
      </EmptyState>
    </div>
  );
}
