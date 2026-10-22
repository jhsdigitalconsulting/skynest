import { PAGE_CONTAINER } from '../../components/layout-styles';

/** Shown while a vault page's server data loads, so clicks get immediate feedback. */
export default function Loading() {
  return (
    <div className={`${PAGE_CONTAINER} py-6`} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-48 rounded bg-gray-200" />
        <div className="h-7 w-80 max-w-full rounded bg-gray-200" />
        <div className="space-y-px overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3 px-5 py-4">
              <div className="h-5 w-5 rounded bg-gray-100" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded bg-gray-100" />
                <div className="h-3 w-2/3 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
