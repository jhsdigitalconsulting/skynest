'use client';

interface Props {
  status: { busy: boolean; message: string } | null;
  onDismiss: () => void;
}

/** A pasted or dropped file's upload in progress, or why it failed. */
export function UploadStatus({ status, onDismiss }: Props) {
  if (!status) return null;
  return (
    <div
      role={status.busy ? 'status' : 'alert'}
      className={`flex items-center justify-between gap-2 border-b px-4 py-2 text-sm ${
        status.busy ? 'border-gray-200 text-gray-600' : 'border-red-200 bg-red-50 text-red-700'
      }`}
    >
      {status.message}
      {!status.busy && (
        <button type="button" onClick={onDismiss} className="font-medium underline">
          Dismiss
        </button>
      )}
    </div>
  );
}
