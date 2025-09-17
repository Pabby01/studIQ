'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/components/providers/providers';
import { Loader2 } from 'lucide-react';

interface QuizQ { q: string; a?: string }

export default function StudyPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || '');
  const { getAccessToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [material, setMaterial] = useState<any | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<{ score: number; correct: boolean[] } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const token = await getAccessToken();
        const res = await fetch(`/api/materials/${id}`, { headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
        if (!res.ok) throw new Error('Failed to load material');
        const json = await res.json();
        setMaterial(json.item);
        const q = Array.isArray(json.item?.quiz) ? json.item.quiz : [];
        setAnswers(new Array(q.length).fill(''));
      } catch (e) {
        // navigate back if not found
        router.replace('/app');
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id, getAccessToken, router]);

  const grade = async () => {
    if (!material) return;
    const quiz: QuizQ[] = Array.isArray(material.quiz) ? material.quiz : [];
    const correct = quiz.map((q, idx) => {
      const ua = (answers[idx] || '').trim().toLowerCase();
      const ga = (q.a || '').trim().toLowerCase();
      if (ga) return ua === ga || ua.includes(ga);
      return ua.length > 0;
    });
    const score = Math.round((correct.filter(Boolean).length / (quiz.length || 1)) * 100);
    setResult({ score, correct });

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

  const quiz: QuizQ[] = Array.isArray(material.quiz) ? material.quiz : [];

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{material.title}</h1>
        <Button variant="secondary" onClick={() => router.push('/app')}>Back to App</Button>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-2">AI Summary</h2>
        <p className="text-gray-700 whitespace-pre-wrap">{material.summary || 'No summary available.'}</p>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Quiz</h2>
          <div className="text-sm text-gray-600">Progress: {Math.round(material.progress ?? 0)}%</div>
        </div>
        <Progress value={material.progress ?? 0} className="h-2 mb-3" />

        {quiz.length === 0 ? (
          <p className="text-sm text-gray-500">No quiz available for this material.</p>
        ) : (
          <div className="space-y-3">
            {quiz.map((q, idx) => (
              <div key={idx} className="space-y-1">
                <p className="font-medium">Q{idx + 1}. {q.q}</p>
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
                    {result.correct[idx] ? 'Correct' : q.a ? `Expected: ${q.a}` : 'Recorded'}
                  </p>
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