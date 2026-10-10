import Link from 'next/link';
import { LoginButton } from '@/components/site/LoginButton';

interface Props {
  signedIn?: boolean;
}

export function HeroSection({ signedIn = false }: Props) {
  return (
    <section className="text-center space-y-6 py-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
        Orlando Health MarTech
      </p>
      <h1 className="text-5xl font-bold tracking-tight text-gray-900">Context Hub</h1>
      <p className="text-xl text-gray-500 max-w-2xl mx-auto">
        The team&apos;s shared knowledge vault, available to Claude, Cursor, and your other AI
        tools through one secure connection.
      </p>
      <div className="flex items-center justify-center gap-4">
        {signedIn ? (
          <Link
            href="/vault"
            className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Open vault →
          </Link>
        ) : (
          <LoginButton className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
            Log in →
          </LoginButton>
        )}
        <Link
          href="/docs"
          className="inline-block border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Connect your AI tool
        </Link>
      </div>
    </section>
  );
}
