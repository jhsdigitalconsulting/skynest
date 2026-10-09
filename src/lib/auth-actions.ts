'use server';

import { signIn } from '@/lib/auth';

// One-click login from the header and home page: go straight to the configured
// provider instead of the intermediate /auth/signin page.
export async function loginAction() {
  const isEntra = (process.env.AUTH_PROVIDER ?? 'github') === 'entra';
  await signIn(isEntra ? 'microsoft-entra-id' : 'github', { redirectTo: '/vault' });
}
