import { describe, it, expect } from 'vitest';
import { buildMeetingDocument } from './document';
import type { MeetingInput } from './input';
import type { MeetingAnalysis } from './schema';

const INPUT: MeetingInput = {
  title: 'Riverside.org Pitch',
  date: '2026-06-01T14:00:00Z',
  platform: 'zoom',
  participants: [{ name: 'Jane', email: 'jane@blackwood-partners.com' }],
  summary: 'Pitch prep.',
  topics: ['pitch'],
  actionItems: ['Finalize deck'],
  chapters: [],
};

const ANALYSIS: MeetingAnalysis & { tagger_error?: boolean } = {
  billing_client: { name: 'Blackwood Partners', slug: 'blackwood-partners' },
  end_client: { name: 'Riverside.org', slug: 'riverside-org' },
  project: { code: 'BWRIV', name: 'Riverside RFP' },
  confidence: 'high',
  topics_canonical: ['proposal'],
  topics_freeform: ['riverside-org'],
  summary: 'Pitch prep.',
  action_items: ['Finalize deck'],
};

describe('buildMeetingDocument', () => {
  it('emits namespaced client/subclient/project/topic tags', () => {
    const { frontmatter } = buildMeetingDocument(INPUT, ANALYSIS, 'req_1', 'sess_1', 'https://r');
    expect(frontmatter.tags).toEqual(expect.arrayContaining([
      '#meetings',
      '#client_blackwood-partners',
      '#subclient_riverside-org',
      '#project_bwriv',
      '#topic_proposal',
      '#riverside-org',
    ]));
    expect(frontmatter.tags).not.toContain('#needs-review');
  });

  it('builds the meeting id from date + client + title slug', () => {
    const { id } = buildMeetingDocument(INPUT, ANALYSIS, 'req_1', 'sess_1', 'https://r');
    expect(id).toBe('nodes/meetings/2026-06-01-blackwood-partners-riverside-org-pitch');
  });

  it('writes structured metadata for code + name retrieval', () => {
    const { frontmatter } = buildMeetingDocument(INPUT, ANALYSIS, 'req_1', 'sess_1', 'https://r');
    const m = frontmatter.metadata as Record<string, unknown>;
    expect(m.client).toBe('blackwood-partners');
    expect(m.client_name).toBe('Blackwood Partners');
    expect(m.subclient).toBe('riverside-org');
    expect(m.project_code).toBe('BWRIV');
    expect(m.project).toBe('Riverside RFP');
    expect(m.topics).toEqual(['proposal', 'riverside-org']);
  });

  it('omits subclient/project keys when absent', () => {
    const a: MeetingAnalysis = {
      ...ANALYSIS, end_client: null, project: null, topics_freeform: [],
    };
    const { frontmatter } = buildMeetingDocument(INPUT, a, 'r', 's', 'u');
    const m = frontmatter.metadata as Record<string, unknown>;
    expect(m.subclient).toBeUndefined();
    expect(m.subclient_name).toBeUndefined();
    expect(m.project_code).toBeUndefined();
    expect(m.project).toBeUndefined();
    expect(m.topics).toEqual(['proposal']);
    expect(frontmatter.tags).not.toContain('#subclient_riverside-org');
  });

  it('adds #needs-review on low confidence', () => {
    const a = { ...ANALYSIS, confidence: 'low' as const };
    const { frontmatter } = buildMeetingDocument(INPUT, a, 'r', 's', 'u');
    expect(frontmatter.tags).toContain('#needs-review');
  });

  it('adds #needs-review on tagger_error', () => {
    const a = { ...ANALYSIS, tagger_error: true };
    const { frontmatter } = buildMeetingDocument(INPUT, a, 'r', 's', 'u');
    expect(frontmatter.tags).toContain('#needs-review');
  });

  it('strips a redundant client-/subclient- prefix the model bakes into the slug', () => {
    const a: MeetingAnalysis = {
      ...ANALYSIS,
      billing_client: { name: 'Acme Corp', slug: 'client-orlando-health' },
      end_client: { name: 'Riverside.org', slug: 'subclient-riverside-org' },
      topics_freeform: [],
    };
    const { id, frontmatter } = buildMeetingDocument(INPUT, a, 'r', 's', 'u');
    expect(frontmatter.tags).toContain('#client_orlando-health');
    expect(frontmatter.tags).not.toContain('#client_client-orlando-health');
    expect(frontmatter.tags).toContain('#subclient_riverside-org');
    expect(id).toBe('nodes/meetings/2026-06-01-orlando-health-riverside-org-pitch');
  });

  it('sanitizes tag segments to the engine regex', () => {
    const a: MeetingAnalysis = { ...ANALYSIS, topics_freeform: ['Sprint 38!'] };
    const { frontmatter } = buildMeetingDocument(INPUT, a, 'r', 's', 'u');
    for (const t of frontmatter.tags!) {
      expect(t).toMatch(/^#[a-zA-Z][a-zA-Z0-9_-]*$/);
    }
    expect(frontmatter.tags).toContain('#sprint-38');
  });
});
