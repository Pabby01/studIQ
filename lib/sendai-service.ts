// Lightweight SendAI wrapper with graceful fallback behavior.
// If SENDAI_API_URL and SENDAI_API_KEY are provided, this will call the remote API.
// Otherwise, it falls back to local, deterministic processing so the app remains functional in dev.

export type QuizQuestion = { q: string; a?: string };
export type SummaryResponse = { summary: string };
export type GenerateQuizResponse = { questions: QuizQuestion[] };

export class SendAI {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string | undefined;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.SENDAI_API_KEY;
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
    // Fallback: naive quiz generation
    const base = (text || '').trim();
    const snippet = base.length > 80 ? base.slice(0, 80) : base;
    const questions: QuizQuestion[] = [
      { q: 'What is the main topic discussed?', a: undefined },
      { q: 'List two key points from the material.', a: undefined },
      { q: `Explain this in your own words: "${snippet}"`, a: undefined },
    ];
    return { questions };
  }

  async extractText(fileUrl: string): Promise<string> {
    if (this.hasRemote()) {
      const result = await this.callRemote<{ text: string }>('/extract-text', { url: fileUrl });
      return result.text || '';
    }
    // Fallback: do not attempt to fetch and parse binary/doc files in dev fallback.
    return `Extracted text from file: ${fileUrl}`;
  }
}