import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { SignInPrompt } from '@/components/auth/SignInPrompt';
import { GitSyncButton } from '@/components/vault/GitSync';
import { HeaderSearch } from '@/components/vault/HeaderSearch';
import { Toaster } from '@/components/vault/Toaster';
import { UserMenu } from '@/components/vault/UserMenu';
import { VaultNav } from '@/components/vault/VaultNav';
import { VaultSwitcher } from '@/components/vault/VaultSwitcher';
import { buttonClass } from '@/components/vault/button-styles';
import { PAGE_CONTAINER } from '@/components/vault/layout-styles';
import { Icon } from '@/components/vault/Icon';
import { getVaultSession } from '@/lib/vault-ui/context';
import { loadDrafts } from '@/lib/vault-ui/data';
import { vaultUrls } from '@/lib/vault-ui/paths';
import { findVault, listVaults } from '@/lib/vault/registry';
import { getGitSource } from '@/lib/vault/sync/git-pull';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ vaultId: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ vaultId: string }> }): Promise<Metadata> {
  const { vaultId } = await params;
  const label = findVault(decodeURIComponent(vaultId))?.label ?? 'Vault';
  return { title: { default: `${label} · Skynest`, template: `%s · ${label} · Skynest` } };
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">{children}</div>;
}

export default async function VaultLayout({ children, params }: LayoutProps) {
  const vaultId = decodeURIComponent((await params).vaultId);
  const vault = findVault(vaultId);
  if (!vault) notFound();
  const urls = vaultUrls(vault.id);
  const session = await getVaultSession();

  if (session.status === 'signed_out') {
    return (
      <Centered>
        <SignInPrompt redirectTo={urls.root} description="Sign in to browse, edit and review the context vault." />
      </Centered>
    );
  }
  if (session.status !== 'ok') {
    const title = session.status === 'no_access' ? 'No access to this vault' : 'Couldn’t check your access';
    const body =
      session.status === 'no_access'
        ? `You're signed in as ${session.login}, but that account hasn't been granted access. Ask an administrator to add you.`
        : session.message;
    return (
      <Centered>
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-200">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <Icon name="lock" className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          <p className="mt-2 text-sm text-gray-500">{body}</p>
          <Link href="/" className={buttonClass('secondary', 'md', 'mt-6')}>
            Back to Skynest
          </Link>
        </div>
      </Centered>
    );
  }

  const { viewer } = session;
  const canSync =
    viewer.access === 'write' && (!viewer.reviewRequired || viewer.isReviewer) && getGitSource(vault.id) !== null;
  const drafts = await loadDrafts(vault.id);
  const login = viewer.login.toLowerCase();
  const reviewCount = drafts.filter((d) => d.status === 'in_review').length;
  const myDraftCount = drafts.filter(
    (d) => d.author.toLowerCase() === login || d.contributors.some((c) => c.toLowerCase() === login),
  ).length;

  return (
    <Toaster>
      <div className="flex min-h-screen flex-col bg-gray-50">
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
          <div className={`${PAGE_CONTAINER} flex h-14 items-center gap-4`}>
            <div className="flex min-w-0 shrink-0 items-center gap-2">
              <Link href={urls.browse()} className="shrink-0" aria-label="Skynest home">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.jpg" alt="" className="h-7 w-7 rounded-md" />
              </Link>
              <span aria-hidden className="text-gray-300">/</span>
              <VaultSwitcher vaults={listVaults()} currentId={vault.id} />
            </div>
            <Suspense fallback={<div className="h-9 w-64" />}>
              <VaultNav reviewCount={viewer.isReviewer ? reviewCount : 0} myDraftCount={myDraftCount} />
            </Suspense>
            <div className="flex flex-1 justify-end">
              <Suspense fallback={<div className="h-9 w-full max-w-md" />}>
                <HeaderSearch />
              </Suspense>
            </div>
            {canSync && <GitSyncButton vaultId={vault.id} />}
            {viewer.access === 'write' && (
              <Link href={urls.newDoc()} className={buttonClass('primary', 'md', 'shrink-0')}>
                <Icon name="plus" />
                <span className="hidden lg:inline">New document</span>
              </Link>
            )}
            <UserMenu viewer={{ login: viewer.login, name: viewer.name, image: viewer.image, access: viewer.access, isReviewer: viewer.isReviewer }} />
          </div>
        </header>
        <div className="flex-1">{children}</div>
      </div>
    </Toaster>
  );
}
