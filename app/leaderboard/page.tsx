import { Suspense } from 'react';
import { LeaderboardPage } from '@/components/leaderboard/leaderboard-page';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export const dynamic = 'force-dynamic';

export default function LeaderboardRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>}>
      <LeaderboardPage />
    </Suspense>
  );
}