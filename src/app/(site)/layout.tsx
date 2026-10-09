import Link from 'next/link';
import { AuthControls } from '@/components/site/AuthControls';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="Skynest" className="h-8 w-auto" />
            <span className="text-lg font-semibold">Skynest</span>
          </Link>
          <div className="flex items-center gap-6">
            <nav className="flex gap-6 text-sm font-medium text-gray-600">
              <Link href="/" className="hover:text-gray-900 transition-colors">Home</Link>
              <Link href="/docs" className="hover:text-gray-900 transition-colors">Docs</Link>
              <Link href="/faq" className="hover:text-gray-900 transition-colors">FAQ</Link>
              <Link href="/vault" className="hover:text-gray-900 transition-colors">Vault</Link>
              <Link href="/admin" className="hover:text-gray-900 transition-colors">Admin</Link>
            </nav>
            <AuthControls />
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-12">{children}</main>
      <footer className="border-t border-gray-200 mt-24">
        <div className="max-w-4xl mx-auto px-6 py-6 text-sm text-gray-400 text-center">
          Orlando Health MarTech — Hosted Context Nest MCP
        </div>
      </footer>
    </>
  );
}
