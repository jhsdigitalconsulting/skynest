import type { GitSource } from './types';

const API = 'https://api.github.com';

function headers(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' };
}

async function fail(res: Response, what: string): Promise<never> {
  throw new Error(`GitHub ${what} failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
}

/** The commit sha the branch currently points at. */
export async function fetchBranchHead(source: GitSource, token: string): Promise<string> {
  const res = await fetch(`${API}/repos/${source.repo}/git/ref/heads/${source.branch}`, {
    headers: headers(token),
  });
  if (!res.ok) await fail(res, `branch lookup for ${source.repo}@${source.branch}`);
  const data = (await res.json()) as { object: { sha: string } };
  return data.object.sha;
}

/** Every file at `commit` as path -> git blob sha. Fails rather than returning a partial tree. */
export async function fetchTreeShas(
  source: GitSource,
  commit: string,
  token: string,
): Promise<Map<string, string>> {
  const res = await fetch(`${API}/repos/${source.repo}/git/trees/${commit}?recursive=1`, {
    headers: headers(token),
  });
  if (!res.ok) await fail(res, 'tree fetch');
  const data = (await res.json()) as {
    tree: { path: string; type: string; sha: string }[];
    truncated: boolean;
  };
  // A truncated tree would make every missing file look deleted in Git.
  if (data.truncated) throw new Error('GitHub returned a truncated tree; the repository is too large to sync safely.');
  return new Map(data.tree.filter((e) => e.type === 'blob').map((e) => [e.path, e.sha]));
}

export async function fetchBlob(source: GitSource, sha: string, token: string): Promise<Buffer> {
  const res = await fetch(`${API}/repos/${source.repo}/git/blobs/${sha}`, { headers: headers(token) });
  if (!res.ok) await fail(res, `blob ${sha.slice(0, 7)}`);
  const data = (await res.json()) as { content: string };
  return Buffer.from(data.content.replace(/\n/g, ''), 'base64');
}
