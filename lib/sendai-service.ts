// Lightweight SendAI wrapper with graceful fallback behavior.
// If SENDAI_API_URL and SENDAI_API_KEY are provided, this will call the remote API.
// Otherwise, it falls back to local, deterministic processing so the app remains functional in dev.

export type QuizQuestion = { q: string; a?: string };
export type SummaryResponse = { summary: string };
export type GenerateQuizResponse = { questions: QuizQuestion[] };

// New MCQ types used for the enhanced quiz flow
export type MCQQuestion = {
  question: string;
  options: [string, string, string, string];
  correctIndex: number; // 0..3
  sourceTitle?: string;
};
export type GenerateMCQResponse = { questions: MCQQuestion[] };

export class SendAI {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string | undefined;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.SENDAI_API_KEY || process.env.OPENAI_API_KEY; // allow OPENAI key as fallback
    this.baseUrl = baseUrl || process.env.SENDAI_API_URL;
  }

  private hasRemote(): boolean {
    return Boolean(this.apiKey && this.baseUrl);
  }

  private async callRemote<T>(path: string, payload: Record<string, any>): Promise<T> {
    if (!this.baseUrl) throw new Error('SENDAI_API_URL is not configured');
    const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`SendAI request failed: ${res.status} ${text}`);
    }
    return (await res.json()) as T;
  }

  async summarize(text: string): Promise<SummaryResponse> {
    if (this.hasRemote()) {
      return this.callRemote<SummaryResponse>('/summarize', { text });
    }
    // Fallback: naive summary (first ~240 chars)
    const clean = (text || '').trim().replace(/\s+/g, ' ');
    const summary = clean.length > 240 ? `${clean.slice(0, 240)}…` : clean;
    return { summary };
  }

  async generateQuiz(text: string): Promise<GenerateQuizResponse> {
    if (this.hasRemote()) {
      return this.callRemote<GenerateQuizResponse>('/quiz', { text });
    }
    // Fallback: naive quiz generation (free-form)
    const base = (text || '').trim();
    const snippet = base.length > 80 ? base.slice(0, 80) : base;
    const questions: QuizQuestion[] = [
      { q: 'What is the main topic discussed?', a: undefined },
      { q: 'List two key points from the material.', a: undefined },
      { q: `Explain this in your own words: "${snippet}"`, a: undefined },
    ];
    return { questions };
  }

  // Enhanced MCQ generator with exactly 4 choices and a single correct answer per question
  async generateMCQ(text: string, count = 10, opts: { sourceTitle?: string; useWebSearch?: boolean } = {}): Promise<GenerateMCQResponse> {
    const n = [10, 20, 50].includes(count) ? count : 10;
    if (this.hasRemote()) {
      // Forward to remote with explicit params; remote may leverage web search and LangChain
      return this.callRemote<GenerateMCQResponse>('/quiz/mcq', {
        text,
        count: n,
        useWebSearch: opts.useWebSearch === true,
        sourceTitle: opts.sourceTitle || undefined,
      });
    }
    // Local deterministic fallback: craft simple MCQs from the text
    const clean = (text || '').replace(/\s+/g, ' ').trim();
    const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
    const take = Math.min(n, Math.max(3, sentences.length));
    const mcqs: MCQQuestion[] = [];
    for (let i = 0; i < take; i++) {
      const s = sentences[i] || clean.slice(0, 120);
      const topic = s.replace(/[.!?]+$/, '');
      const correct = topic.length > 60 ? topic.slice(0, 60) + '…' : topic;
      const distractor1 = 'An unrelated statement';
      const distractor2 = 'A partially correct idea';
      const distractor3 = 'None of the above';
      const options = [correct, distractor1, distractor2, distractor3] as [string, string, string, string];
      mcqs.push({ question: `What best summarizes: "${s}"?`, options, correctIndex: 0, sourceTitle: opts.sourceTitle });
    }
    // If asked for more than available sentences, pad by repeating variations
    while (mcqs.length < n) {
      mcqs.push({
        question: 'Which option is most accurate according to the material?',
        options: ['The main concept described', 'A random guess', 'An opposite claim', 'Irrelevant detail'],
        correctIndex: 0,
        sourceTitle: opts.sourceTitle,
      });
    }
    return { questions: mcqs.slice(0, n) };
  }

  async extractText(fileUrl: string, opts: { sourceTitle?: string } = {}): Promise<string> {
    if (this.hasRemote()) {
      const result = await this.callRemote<{ text: string }>('/extract-text', { url: fileUrl });
      return result.text || '';
    }
    // Fallback: avoid exposing raw URLs in UI; prefer a neutral message with optional title
    const title = (opts?.sourceTitle || '').trim();
    if (title) {
      return `Extracted text from: ${title}`;
    }
    return 'Extracted text from uploaded file.';
  }
}