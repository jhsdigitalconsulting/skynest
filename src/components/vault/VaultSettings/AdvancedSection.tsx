import { Section } from './Section';

interface Props {
  /** The settings this page doesn't edit (servers, sync, defaults…), as YAML. Empty when there are none. */
  yaml: string;
}

/** Read-only view of the integration settings, so reviewers can see them without being able to break them. */
export function AdvancedSection({ yaml }: Props) {
  return (
    <Section
      title="Other settings"
      description="Server endpoints, sync and the file format version. They’re read-only here — change them in the vault repository."
    >
      {yaml ? (
        <pre className="overflow-x-auto rounded-lg bg-gray-50 p-3 font-mono text-xs text-gray-700 ring-1 ring-gray-200">{yaml}</pre>
      ) : (
        <p className="text-sm text-gray-500">None set.</p>
      )}
    </Section>
  );
}
