import { NAME_MAX } from '../../lib/vault-settings';
import { FIELD_INPUT, FIELD_LABEL, FIELD_TEXTAREA } from '../field-styles';
import { Section } from './Section';

interface Props {
  name: string;
  description: string;
  fallbackName: string;
  onChange: (fields: { name?: string; description?: string }) => void;
}

export function DetailsSection({ name, description, fallbackName, onChange }: Props) {
  return (
    <Section title="Details" description="The name shows in the header, the vault switcher and breadcrumbs, and heads the agent files.">
      <div className="grid gap-4">
        <div>
          <label htmlFor="vault-name" className={FIELD_LABEL}>
            Name
          </label>
          <input
            id="vault-name"
            value={name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder={fallbackName}
            maxLength={NAME_MAX}
            required
            aria-describedby={name.trim() ? undefined : 'vault-name-hint'}
            className={FIELD_INPUT}
          />
          {!name.trim() && (
            <p id="vault-name-hint" className="mt-1.5 text-xs text-amber-700">
              No name saved yet, so the vault shows as “{fallbackName}”.
            </p>
          )}
        </div>
        <div>
          <label htmlFor="vault-description" className={FIELD_LABEL}>
            Description <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <textarea
            id="vault-description"
            value={description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="What this vault is for, in a sentence"
            rows={2}
            className={FIELD_TEXTAREA}
          />
        </div>
      </div>
    </Section>
  );
}
