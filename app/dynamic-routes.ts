export const dynamicPages = [
  '/app',
  '/login',
  '/leaderboard',
  '/test-xp',
  '/api/leaderboard',
  '/api/xp',
  '/api/badges/check'
] as const;

// Helper function to check if a route should be dynamic
export function isDynamicRoute(path: string) {
  return dynamicPages.some(route => path.startsWith(route));
}