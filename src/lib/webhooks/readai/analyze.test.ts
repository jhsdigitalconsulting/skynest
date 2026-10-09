import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MeetingInput } from './input';

vi.mock('ai', () => ({ generateText: vi.fn() }));
vi.mock('@ai-sdk/gateway', () => ({ createGateway: vi.fn(() => vi.fn()) }));

import { generateText } from 'ai';
import { analyzeMeeting } from './analyze';

const mockGenerateText = vi.mocked(generateText);

const INPUT: MeetingInput = {
  title: 'Acme Web Scrum',
  date: '2026-06-08T14:00:00Z',
  platform: 'teams',
  participants: [{ name: 'Alex Rivera', email: 'alex.rivera@acmecorp.com' }],
  summary: 'Sprint 38 planning.',
  topics: ['sprint planning'],
  actionItems: ['Add Alex to Vercel'],
  chapters: [],
};

const KNOWLEDGE = {
  registry: '| `acmecorp.com` | Acme Corp | Acme Corp | 2026 Martech Staffing (ACME26MT) |',
  topicVocab: '- `scrum` — standups',
  examples: 'Acme Web Scrum -> Acme Corp, ACME26MT, topic scrum',
};

const VALID = JSON.stringify({
  billing_client: { name: 'Acme Corp', slug: 'orlando-health' },
  end_client: null,
  project: { code: 'ACME26MT', name: '2026 Martech Staffing' },
  confidence: 'high',
  topics_canonical: ['scrum'],
  topics_freeform: [],
  summary: 'Sprint 38 planning.',
  action_items: ['Add Alex to Vercel'],
});

function resolve(text: string) {
  return { text } as ReturnType<typeof generateText> extends Promise<infer T> ? T : never;
}

describe('analyzeMeeting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VERCEL_AI_GATEWAY_KEY = 'test-key';
  });

  it('parses a valid response with project and client', async () => {
    mockGenerateText.mockResolvedValue(resolve(VALID));
    const r = await analyzeMeeting(INPUT, KNOWLEDGE);
    expect(r.billing_client.slug).toBe('orlando-health');
    expect(r.project?.code).toBe('ACME26MT');
    expect(r.confidence).toBe('high');
    expect(r.tagger_error).toBeUndefined();
  });

  it('flags tagger_error and unknown client on unparseable output', async () => {
    mockGenerateText.mockResolvedValue(resolve('not json'));
    const r = await analyzeMeeting(INPUT, KNOWLEDGE);
    expect(r.billing_client.slug).toBe('unknown');
    expect(r.tagger_error).toBe(true);
  });

  it('flags tagger_error and unknown client on schema-invalid output', async () => {
    const badShape = JSON.stringify({
      billing_client: { name: 'Acme Corp', slug: 'orlando-health' },
      end_client: null,
      project: { code: 'ACME26MT', name: '2026 Martech Staffing' },
      confidence: 'very-high', // not a valid enum value
      topics_canonical: [],
      topics_freeform: [],
      summary: '',
      action_items: [],
    });
    mockGenerateText.mockResolvedValue(resolve(badShape));
    const r = await analyzeMeeting(INPUT, KNOWLEDGE);
    expect(r.billing_client.slug).toBe('unknown');
    expect(r.tagger_error).toBe(true);
  });

  it('clears client, end_client, and project when confidence is low', async () => {
    const low = JSON.stringify({
      billing_client: { name: 'Maybe', slug: 'maybe' },
      end_client: { name: 'Some End Client', slug: 'some-end-client' },
      project: { code: 'XYZ', name: 'Some Project' },
      confidence: 'low',
      topics_canonical: [], topics_freeform: [], summary: '', action_items: [],
    });
    mockGenerateText.mockResolvedValue(resolve(low));
    const r = await analyzeMeeting(INPUT, KNOWLEDGE);
    expect(r.billing_client.slug).toBe('unknown');
    expect(r.end_client).toBeNull();
    expect(r.project).toBeNull();
  });

  it('injects all three knowledge docs and input into the prompt', async () => {
    mockGenerateText.mockResolvedValue(resolve(VALID));
    await analyzeMeeting(INPUT, KNOWLEDGE);
    const prompt = mockGenerateText.mock.calls[0][0].prompt as string;
    expect(prompt).toContain('acmecorp.com');
    expect(prompt).toContain('scrum');
    expect(prompt).toContain('Acme Web Scrum');
    expect(prompt).toContain('ACME26MT');
  });
});
