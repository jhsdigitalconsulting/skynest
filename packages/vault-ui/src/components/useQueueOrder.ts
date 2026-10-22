'use client';

import { useSyncExternalStore } from 'react';
import type { QueueTab } from '../lib/review-queue';

interface QueueOrder {
  tab: QueueTab;
  /** Doc ids in the order the list shows them, after search, filters and sort. */
  ids: string[];
}

const EMPTY: QueueOrder = { tab: 'review', ids: [] };

// The list and the draft pane render in different components; this is how the pane learns what comes next.
let current = EMPTY;
const listeners = new Set<() => void>();

export function publishQueueOrder(next: QueueOrder) {
  if (next.tab === current.tab && next.ids.length === current.ids.length && next.ids.every((id, i) => id === current.ids[i])) return;
  current = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The review list as currently shown. Empty on the server and until the list has mounted. */
export function useQueueOrder(): QueueOrder {
  return useSyncExternalStore(subscribe, () => current, () => EMPTY);
}
