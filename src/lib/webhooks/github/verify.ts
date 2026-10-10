import { createHmac, timingSafeEqual } from 'crypto';

/** Verify GitHub's `X-Hub-Signature-256` header (`sha256=<hex hmac of the raw body>`). */
export function verifyGithubSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header || !secret || !header.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest();
  const given = Buffer.from(header.slice('sha256='.length), 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}
