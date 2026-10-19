import { AGENT_TOOLS } from '@/lib/vault-ui/vault-settings';
import { FIELD_LABEL, FIELD_TEXTAREA } from '../field-styles';
import { Section } from './Section';

interface Props {
  tools: string[];
  directive: string;
  onChange: (fields: { agentTools?: string[]; directive?: string }) => void;
}

export function AgentSection({ tools, directive, onChange }: Props) {
  const toggle = (id: string, on: boolean) =>
    onChange({ agentTools: on ? [...tools, id] : tools.filter((t) => t !== id) });

  return (
    <Section
      title="Agent files"
      description={
        <>
          Used when someone runs <code className="rounded bg-gray-100 px-1 text-xs">ctx index</code> in a checkout of the
          vault: it writes a managed section into each selected tool’s instructions file. Agents connected over MCP aren’t
          affected — they read the vault instructions.
        </>
      }
    >
      <fieldset>
        <legend className={FIELD_LABEL}>Write instructions for</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {AGENT_TOOLS.map((t) => (
            <label key={t.id} className="flex items-center gap-2.5 text-sm text-gray-800">
              <input
                type="checkbox"
                checked={tools.includes(t.id)}
                onChange={(e) => toggle(t.id, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              {t.label}
              <code className="truncate text-xs text-gray-500">{t.file}</code>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-4">
        <label htmlFor="vault-directive" className={FIELD_LABEL}>
          Maintenance directive <span className="font-normal text-gray-400">(markdown, optional)</span>
        </label>
        <textarea
          id="vault-directive"
          value={directive}
          onChange={(e) => onChange({ directive: e.target.value })}
          placeholder="Leave empty to use the built-in “Maintaining This Nest” directive, which asks agents to keep the vault up to date as they work."
          rows={6}
          className={`${FIELD_TEXTAREA} font-mono text-xs`}
        />
      </div>
    </Section>
  );
}
