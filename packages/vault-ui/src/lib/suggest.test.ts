import { describe, expect, it } from 'vitest';
import { suggestDocs } from './suggest';

const doc = (id: string, title: string, tags: string[] = []) => ({ id, title, tags });
const docs = [
  doc('nodes/a/zeta', 'Zeta notes', ['#ontology']),
  doc('nodes/b/ontology-authoring', 'Ontology Authoring Conventions'),
  doc('nodes/c/team-ontology', 'The ontology team'),
  doc('nodes/d/other', 'Unrelated'),
];

describe('suggestDocs', () => {
  it('returns nothing for an empty query', () => {
    expect(suggestDocs(docs, '  ')).toEqual([]);
  });

  it('ranks title-prefix matches above title, then path/tag matches', () => {
    expect(suggestDocs(docs, 'ontology').map((d) => d.id)).toEqual([
      'nodes/b/ontology-authoring',
      'nodes/c/team-ontology',
      'nodes/a/zeta',
    ]);
  });

  it('requires every word to match', () => {
    expect(suggestDocs(docs, 'ontology authoring').map((d) => d.id)).toEqual(['nodes/b/ontology-authoring']);
  });

  it('honours the limit', () => {
    expect(suggestDocs(docs, 'o', 2)).toHaveLength(2);
  });
});
