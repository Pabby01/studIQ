export const routeConfig = {
  // Dynamic routes that require server-side features
  dynamic: {
    app: true,
    login: true,
    leaderboard: true,
    'test-xp': true,
    api: {
      leaderboard: true,
      xp: true,
      badges: {
        check: true
      }
    }
  },
  // Static routes that can be pre-rendered
  static: {
    home: true,
    features: true,
    contact: true,
    why: true
  }
} as const;