'use client';

interface Props {
  status: { busy: boolean; message: string } | null;
  onDismiss: () => void;
  onCancel: () => void;
}

/** A pasted or dropped file's upload in progress, or why it failed. */
export function UploadStatus({ status, onDismiss, onCancel }: Props) {
  if (!status) return null;
  return (
    <div
      role={status.busy ? 'status' : 'alert'}
      className={`flex items-center justify-between gap-2 border-t px-4 py-2 text-sm ${
        status.busy ? 'border-gray-200 text-gray-600' : 'border-red-200 bg-red-50 text-red-700'
      }`}
    >
      {status.message}
      <button type="button" onClick={status.busy ? onCancel : onDismiss} className="font-medium underline">
        {status.busy ? 'Cancel' : 'Dismiss'}
      </button>
    </div>
  );
}
