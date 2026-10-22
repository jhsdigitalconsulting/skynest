import { describe, expect, it } from 'vitest';
import { canonicalTag, cleanTag, suggestTags, tagVocabulary } from './tags';

const doc = (tags: string[]) => ({ id: 'x', title: 'x', tags });
const vocab = tagVocabulary([
  doc(['#ontology', '#governance']),
  doc(['#ontology', '#orlando-health']),
  doc(['#Ontology']),
  doc(['#knowledge']),
]);

describe('tagVocabulary', () => {
  it('counts tags across documents, merging case variants under the most-used spelling', () => {
    expect(vocab[0]).toEqual({ tag: 'ontology', count: 3 });
    expect(vocab.map((v) => v.tag)).toEqual(['ontology', 'governance', 'knowledge', 'orlando-health']);
  });
});

describe('cleanTag', () => {
  it('drops # and turns spaces into hyphens', () => {
    expect(cleanTag('  #Foo bar ')).toBe('Foo-bar');
  });
});

describe('canonicalTag', () => {
  it('reuses the vault spelling when the tag exists in any case', () => {
    expect(canonicalTag(vocab, 'ONTOLOGY')).toBe('ontology');
    expect(canonicalTag(vocab, 'brand-new')).toBe('brand-new');
  });
});

describe('suggestTags', () => {
  it('lists the most used tags for an empty query, minus applied ones', () => {
    expect(suggestTags(vocab, ['#ontology'], '').map((v) => v.tag)).toEqual(['governance', 'knowledge', 'orlando-health']);
  });

  it('ranks prefix matches before contains matches', () => {
    expect(suggestTags(vocab, [], 'o').map((v) => v.tag)).toEqual(['ontology', 'orlando-health', 'governance', 'knowledge']);
  });

  it('never suggests an applied tag, regardless of case', () => {
    expect(suggestTags(vocab, ['#Orlando-Health'], 'orl')).toEqual([]);
  });
});
