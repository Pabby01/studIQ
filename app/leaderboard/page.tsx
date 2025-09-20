import { Metadata } from 'next';
import LeaderboardPage from '@/components/leaderboard/leaderboard-page';

export const metadata: Metadata = {
  title: 'Leaderboard | StudIQ',
  description: 'View the StudIQ leaderboard and see how you rank among other students.',
};

export default function Leaderboard() {
  return <LeaderboardPage />;
}