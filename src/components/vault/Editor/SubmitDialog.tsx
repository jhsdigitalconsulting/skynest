'use client';

import { NoteDialog } from '../NoteDialog';

export type SubmitMode = 'submit' | 'publish';

interface Props {
  mode: SubmitMode | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: (note: string) => void;
}

const COPY = {
  submit: {
    title: 'Submit for review',
    description: 'A reviewer will look over your changes. You can keep editing until they approve it.',
    label: 'Note for the reviewer (optional)',
    placeholder: 'What changed and why?',
    cta: 'Submit for review',
  },
  publish: {
    title: 'Publish now',
    description: 'As a reviewer you can publish directly. This creates a new version right away.',
    label: 'Version note (optional)',
    placeholder: 'Summarize this change for the history…',
    cta: 'Publish',
  },
} as const;

export function SubmitDialog({ mode, pending, onClose, onConfirm }: Props) {
  const copy = COPY[mode ?? 'submit'];
  return (
    <NoteDialog
      open={mode !== null}
      pending={pending}
      {...copy}
      variant={mode === 'publish' ? 'success' : 'primary'}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
