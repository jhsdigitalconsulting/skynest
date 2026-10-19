/**
 * Reviewer roles.
 *
 * - `AUTHZ_REVIEWERS` — comma-separated IdP logins (GitHub usernames, or Entra
 *   UPNs/emails) allowed to approve drafts. Case-insensitive.
 * - `AUTHZ_ENTRA_REVIEWER_GROUP_ID` — Entra group whose members are reviewers.
 *   Only checkable where group claims are present (the web UI session); MCP
 *   bearer tokens carry no groups, so MCP reviewers must be listed by login.
 *
 * With neither set, every writer is a reviewer — the pre-review behaviour,
 * so existing single-team deployments keep working unchanged.
 */

function parseList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function reviewerRolesConfigured(): boolean {
  return (
    parseList(process.env.AUTHZ_REVIEWERS).length > 0 ||
    Boolean(process.env.AUTHZ_ENTRA_REVIEWER_GROUP_ID?.trim())
  );
}

export function isReviewer(login: string | undefined, groups?: string[]): boolean {
  if (!reviewerRolesConfigured()) return true;
  const logins = parseList(process.env.AUTHZ_REVIEWERS);
  if (login && logins.includes(login.trim().toLowerCase())) return true;
  const groupId = process.env.AUTHZ_ENTRA_REVIEWER_GROUP_ID?.trim();
  if (groupId && groups?.includes(groupId)) return true;
  return false;
}

/**
 * `CONTEXTNEST_REQUIRE_REVIEW=true` routes direct writes from non-reviewers
 * (MCP create_document / update_document) into the review queue instead of
 * publishing them, and restricts publish/delete to reviewers.
 */
export function isReviewRequired(): boolean {
  return process.env.CONTEXTNEST_REQUIRE_REVIEW === 'true';
}
