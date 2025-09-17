'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/components/providers/providers';
import { Loader2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface LegacyQuizQ { q: string; a?: string }
interface MCQ { question: string; options: [string, string, string, string]; correctIndex: number; sourceTitle?: string }

type AnyQuestion = { type: 'mcq'; data: MCQ } | { type: 'legacy'; data: LegacyQuizQ };

export default function StudyPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || '');
  const { getAccessToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [material, setMaterial] = useState<any | null>(null);

  const sanitizeSummary = (s: string): string => {
    if (!s) return s;
    return s
      .replace(/https?:\/\/\S+/g, '')
      .replace(/Extracted\s+text\s+from\s+file:\s*/i, '')
      .trim();
  };
  const stripUrls = (s: string) => (s || '').replace(/https?:\/\/\S+/g, '').replace(/Extracted\s+text\s+from\s+file:\s*/i, '').replace(/\s+/g, ' ').trim();
  const sanitizeQuestion = (q: AnyQuestion): AnyQuestion => {
    if (q.type === 'mcq') {
      return {
        type: 'mcq',
        data: {
          ...q.data,
          question: stripUrls(q.data.question),
          options: q.data.options.map((o) => stripUrls(o)) as [string, string, string, string]
        }
      };
    }
    return { type: 'legacy', data: { ...q.data, q: stripUrls(q.data.q), a: q.data.a ? stripUrls(q.data.a) : q.data.a } };
  };
  const [answers, setAnswers] = useState<string[]>([]); // stores selected option index as string for MCQ or free text for legacy
  const [result, setResult] = useState<{ score: number; correct: boolean[] } | null>(null);

  const normalizeQuestions = (raw: any): AnyQuestion[] => {
    if (!Array.isArray(raw)) return [];
    if (raw.length > 0 && typeof raw[0]?.question === 'string' && Array.isArray(raw[0]?.options)) {
      // MCQ shape
      return raw.map((r: any) => sanitizeQuestion({ type: 'mcq', data: r as MCQ }));
    }
    // Legacy free-form
    return raw.map((r: any) => sanitizeQuestion({ type: 'legacy', data: r as LegacyQuizQ }));
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const token = await getAccessToken();
        const res = await fetch(`/api/materials/${id}`, { headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
        if (!res.ok) throw new Error('Failed to load material');
        const json = await res.json();
        setMaterial(json.item);
        const normalized = normalizeQuestions(json.item?.quiz);
        setAnswers(new Array(normalized.length).fill(''));
      } catch (e) {
        router.replace('/app');
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id, getAccessToken, router, normalizeQuestions]);

  const grade = async () => {
    if (!material) return;
    const questions = normalizeQuestions(material.quiz);
    const correctness = questions.map((q, idx) => {
      if (q.type === 'mcq') {
        const selected = answers[idx];
        const selectedIdx = selected === '' ? -1 : parseInt(selected, 10);
        return selectedIdx === q.data.correctIndex;
      }
      // legacy
      const ua = (answers[idx] || '').trim().toLowerCase();
      const ga = (q.data.a || '').trim().toLowerCase();
      if (ga) return ua === ga || ua.includes(ga);
      return ua.length > 0;
    });
    const score = Math.round((correctness.filter(Boolean).length / (questions.length || 1)) * 100);
    setResult({ score, correct: correctness });

    try {
      setSaving(true);
      const token = await getAccessToken();
      await fetch(`/api/materials/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ progress: score })
      });
      setMaterial((m: any) => ({ ...m, progress: score }));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
    );
  }

  if (!material) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">Material not found</Card>
      </div>
    );
  }

  const questions = normalizeQuestions(material.quiz);

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{material.title}</h1>
        <Button variant="secondary" onClick={() => router.push('/app')}>Back to App</Button>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-2">AI Summary</h2>
        <p className="text-gray-700 whitespace-pre-wrap">{sanitizeSummary(material.summary || 'No summary available.')}</p>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Quiz</h2>
          <div className="text-sm text-gray-600">Progress: {Math.round(material.progress ?? 0)}%</div>
        </div>
        <Progress value={material.progress ?? 0} className="h-2 mb-3" />

        {questions.length === 0 ? (
          <p className="text-sm text-gray-500">No quiz available for this material.</p>
        ) : (
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div key={idx} className="space-y-2">
                {q.type === 'mcq' ? (
                  <div className="space-y-2">
                    <p className="font-medium">Q{idx + 1}. {q.data.question}</p>
                    {q.data.sourceTitle && (
                      <p className="text-xs text-gray-500">Source: {q.data.sourceTitle}</p>
                    )}
                    <RadioGroup
                      value={answers[idx] || ''}
                      onValueChange={(val) => {
                        const next = [...answers];
                        next[idx] = val;
                        setAnswers(next);
                      }}
                    >
                      {q.data.options.map((opt, i) => (
                        <label key={i} className="flex items-center gap-2 p-2 border rounded-md">
                          <RadioGroupItem value={String(i)} />
                          <span className="text-sm">{opt}</span>
                        </label>
                      ))}
                    </RadioGroup>
                    {result && (
                      <p className={`text-xs ${result.correct[idx] ? 'text-green-600' : 'text-red-600'}`}>
                        {result.correct[idx] ? 'Correct' : `Correct answer: ${q.data.options[q.data.correctIndex]}`}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="font-medium">Q{idx + 1}. {q.data.q}</p>
                    <Input
                      placeholder="Your answer"
                      value={answers[idx] || ''}
                      onChange={(e) => {
                        const next = [...answers];
                        next[idx] = e.target.value;
                        setAnswers(next);
                      }}
                    />
                    {result && (
                      <p className={`text-xs ${result.correct[idx] ? 'text-green-600' : 'text-red-600'}`}>
                        {result.correct[idx] ? 'Correct' : q.data.a ? `Expected: ${q.data.a}` : 'Recorded'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={grade} disabled={saving}>{saving ? 'Saving...' : 'Submit Quiz'} </Button>
              {result && <span className="text-sm">Score: <span className="font-semibold">{result.score}%</span></span>}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}