'use client';

import Link from 'next/link';
import { EmptyState } from '../../components/EmptyState';
import { buttonClass } from '../../components/button-styles';
import { PAGE_CONTAINER } from '../../components/layout-styles';
import { useVaultUrls } from '../../components/useVault';

/** A missing document or draft, shown inside the vault header rather than the bare site 404. */
export default function VaultNotFound() {
  const urls = useVaultUrls();
  return (
    <div className={`${PAGE_CONTAINER} py-10`}>
      <EmptyState
        icon="search"
        title="Not found"
        action={
          <Link href={urls.browse()} className={buttonClass('secondary')}>
            Back to all documents
          </Link>
        }
      >
        This document or draft doesn’t exist. It may have been moved, renamed or deleted. Try the search above.
      </EmptyState>
    </div>
  );
}
