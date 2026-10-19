import type { ReactNode } from 'react';

interface Props {
  title: string;
  description: ReactNode;
  children: ReactNode;
}

/** One card on the Settings page. */
export function Section({ title, description, children }: Props) {
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <p className="mt-1 text-sm text-gray-600">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}
