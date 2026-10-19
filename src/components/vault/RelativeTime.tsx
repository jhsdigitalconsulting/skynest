'use client';

import { useEffect, useState } from 'react';

function format(iso: string, now: number): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const s = Math.round((now - then) / 1000);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * "3h ago", refreshed each minute. The server renders the relative form from its
 * own clock, so the text is already right on first paint; the client takes over
 * after mount. The two clocks can disagree by a minute at a boundary, hence
 * suppressHydrationWarning on just this element.
 */
export function RelativeTime({ iso, className }: { iso: string | null | undefined; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  const [title, setTitle] = useState<string | undefined>(undefined);
  useEffect(() => {
    setNow(Date.now());
    // Full date in the viewer's own locale and time zone, for the hover tooltip.
    if (iso) setTitle(new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }));
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, [iso]);
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return (
    <time dateTime={iso} title={title} className={className} suppressHydrationWarning>
      {format(iso, now)}
    </time>
  );
}
