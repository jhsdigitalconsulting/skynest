import Link from 'next/link';
import { auth, signOut } from '@/lib/auth';

export const LOGIN_HREF = '/auth/signin?callbackUrl=/vault';

interface ViewProps {
  userName?: string;
  signOutAction?: () => Promise<void>;
}

export function AuthControlsView({ userName, signOutAction }: ViewProps) {
  if (!userName) {
    return (
      <Link
        href={LOGIN_HREF}
        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
      >
        Log in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-gray-600">{userName}</span>
      <form action={signOutAction}>
        <button
          type="submit"
          className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}

export async function AuthControls() {
  const session = await auth();
  const user = session?.user;
  const userName = user ? (user.name ?? user.email ?? 'Signed in') : undefined;

  return (
    <AuthControlsView
      userName={userName}
      signOutAction={async () => {
        'use server';
        await signOut({ redirectTo: '/' });
      }}
    />
  );
}
