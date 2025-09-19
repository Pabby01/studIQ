-- Seed data for XP system testing
-- This script creates sample users, XP data, badges, and activities

-- Insert sample users (if they don't exist)
INSERT INTO public.users (id, username, full_name, email, avatar_url) 
VALUES 
  ('user1-test-id', 'alice_student', 'Alice Johnson', 'alice@university.edu', 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice'),
  ('user2-test-id', 'bob_learner', 'Bob Smith', 'bob@university.edu', 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob'),
  ('user3-test-id', 'carol_finance', 'Carol Davis', 'carol@university.edu', 'https://api.dicebear.com/7.x/avataaars/svg?seed=carol'),
  ('user4-test-id', 'david_campus', 'David Wilson', 'david@university.edu', 'https://api.dicebear.com/7.x/avataaars/svg?seed=david'),
  ('user5-test-id', 'emma_allround', 'Emma Brown', 'emma@university.edu', 'https://api.dicebear.com/7.x/avataaars/svg?seed=emma')
ON CONFLICT (id) DO NOTHING;

-- Insert sample XP data
INSERT INTO public.user_xp (user_id, campus_xp, learning_xp, finance_xp, club_xp, total_xp, last_updated)
VALUES 
  ('user1-test-id', 150, 200, 75, 100, 525, NOW()),
  ('user2-test-id', 100, 350, 50, 80, 580, NOW()),
  ('user3-test-id', 80, 120, 300, 60, 560, NOW()),
  ('user4-test-id', 250, 100, 100, 150, 600, NOW()),
  ('user5-test-id', 200, 250, 200, 120, 770, NOW())
ON CONFLICT (user_id) DO UPDATE SET
  campus_xp = EXCLUDED.campus_xp,
  learning_xp = EXCLUDED.learning_xp,
  finance_xp = EXCLUDED.finance_xp,
  club_xp = EXCLUDED.club_xp,
  total_xp = EXCLUDED.total_xp,
  last_updated = NOW();

-- Insert sample badges
INSERT INTO public.badges (id, name, description, icon, category, xp_requirement, hub_type, created_at)
VALUES 
  ('badge-first-steps', 'First Steps', 'Complete your first activity', '🎯', 'milestone', 10, 'campus', NOW()),
  ('badge-learner', 'Dedicated Learner', 'Upload 5 study materials', '📚', 'learning', 100, 'learning', NOW()),
  ('badge-financier', 'Money Manager', 'Complete 10 transactions', '💰', 'finance', 150, 'finance', NOW()),
  ('badge-social', 'Social Butterfly', 'Join 3 clubs', '🦋', 'social', 75, 'campus', NOW()),
  ('badge-achiever', 'High Achiever', 'Reach level 5', '🏆', 'milestone', 500, NULL, NOW()),
  ('badge-streak', 'Streak Master', 'Maintain 7-day login streak', '🔥', 'engagement', 50, 'campus', NOW()),
  ('badge-quiz-master', 'Quiz Master', 'Score 90%+ on 5 quizzes', '🧠', 'learning', 200, 'learning', NOW()),
  ('badge-trader', 'Crypto Trader', 'Complete first crypto transaction', '₿', 'finance', 25, 'finance', NOW())
ON CONFLICT (id) DO NOTHING;

-- Award some badges to users
INSERT INTO public.user_badges (user_id, badge_id, unlocked_at)
VALUES 
  ('user1-test-id', 'badge-first-steps', NOW() - INTERVAL '5 days'),
  ('user1-test-id', 'badge-learner', NOW() - INTERVAL '3 days'),
  ('user2-test-id', 'badge-first-steps', NOW() - INTERVAL '7 days'),
  ('user2-test-id', 'badge-learner', NOW() - INTERVAL '2 days'),
  ('user2-test-id', 'badge-quiz-master', NOW() - INTERVAL '1 day'),
  ('user3-test-id', 'badge-first-steps', NOW() - INTERVAL '6 days'),
  ('user3-test-id', 'badge-financier', NOW() - INTERVAL '1 day'),
  ('user3-test-id', 'badge-trader', NOW() - INTERVAL '2 days'),
  ('user4-test-id', 'badge-first-steps', NOW() - INTERVAL '4 days'),
  ('user4-test-id', 'badge-social', NOW() - INTERVAL '2 days'),
  ('user5-test-id', 'badge-first-steps', NOW() - INTERVAL '8 days'),
  ('user5-test-id', 'badge-learner', NOW() - INTERVAL '4 days'),
  ('user5-test-id', 'badge-achiever', NOW() - INTERVAL '1 day'),
  ('user5-test-id', 'badge-streak', NOW() - INTERVAL '3 days')
ON CONFLICT (user_id, badge_id) DO NOTHING;

-- Insert sample XP activities for history
INSERT INTO public.xp_activities (user_id, action, xp_amount, hub_type, metadata, created_at)
VALUES 
  ('user1-test-id', 'daily_login', 10, 'campus', '{"streak": 3}', NOW() - INTERVAL '1 hour'),
  ('user1-test-id', 'study_material_upload', 25, 'learning', '{"material_type": "pdf"}', NOW() - INTERVAL '2 hours'),
  ('user2-test-id', 'quiz_completion', 35, 'learning', '{"score": 85, "quiz_id": "quiz123"}', NOW() - INTERVAL '3 hours'),
  ('user2-test-id', 'club_join', 15, 'campus', '{"club_id": "club456"}', NOW() - INTERVAL '4 hours'),
  ('user3-test-id', 'transaction_complete', 15, 'finance', '{"amount": 25.50, "type": "send"}', NOW() - INTERVAL '1 hour'),
  ('user3-test-id', 'daily_login', 10, 'campus', '{"streak": 5}', NOW() - INTERVAL '30 minutes'),
  ('user4-test-id', 'event_attendance', 20, 'campus', '{"event_id": "event789"}', NOW() - INTERVAL '2 hours'),
  ('user4-test-id', 'club_post', 5, 'campus', '{"club_id": "club456", "post_type": "text"}', NOW() - INTERVAL '1 hour'),
  ('user5-test-id', 'study_material_upload', 25, 'learning', '{"material_type": "document"}', NOW() - INTERVAL '45 minutes'),
  ('user5-test-id', 'quiz_completion', 50, 'learning', '{"score": 95, "quiz_id": "quiz789"}', NOW() - INTERVAL '30 minutes')
ON CONFLICT DO NOTHING;

-- Insert sample clubs for club XP testing
INSERT INTO public.clubs (id, name, description, category, created_at)
VALUES 
  ('club-tech', 'Tech Innovators', 'A club for technology enthusiasts', 'technology', NOW()),
  ('club-finance', 'Finance Society', 'Learn about personal finance and investing', 'finance', NOW()),
  ('club-study', 'Study Group', 'Collaborative learning and study sessions', 'academic', NOW())
ON CONFLICT (id) DO NOTHING;

-- Add users to clubs
INSERT INTO public.club_members (club_id, user_id, role, joined_at)
VALUES 
  ('club-tech', 'user1-test-id', 'member', NOW() - INTERVAL '5 days'),
  ('club-tech', 'user2-test-id', 'admin', NOW() - INTERVAL '7 days'),
  ('club-tech', 'user4-test-id', 'member', NOW() - INTERVAL '3 days'),
  ('club-finance', 'user3-test-id', 'member', NOW() - INTERVAL '6 days'),
  ('club-finance', 'user5-test-id', 'member', NOW() - INTERVAL '4 days'),
  ('club-study', 'user1-test-id', 'member', NOW() - INTERVAL '2 days'),
  ('club-study', 'user2-test-id', 'member', NOW() - INTERVAL '4 days'),
  ('club-study', 'user5-test-id', 'admin', NOW() - INTERVAL '8 days')
ON CONFLICT (club_id, user_id) DO NOTHING;

-- Update user profiles with additional data
UPDATE public.users 
SET 
  updated_at = NOW(),
  bio = CASE 
    WHEN username = 'alice_student' THEN 'Computer Science major passionate about AI and machine learning'
    WHEN username = 'bob_learner' THEN 'Business student with interests in entrepreneurship and innovation'
    WHEN username = 'carol_finance' THEN 'Economics major focused on financial markets and cryptocurrency'
    WHEN username = 'david_campus' THEN 'Active campus leader involved in multiple student organizations'
    WHEN username = 'emma_allround' THEN 'Well-rounded student excelling in academics, finance, and social activities'
    ELSE bio
  END
WHERE username IN ('alice_student', 'bob_learner', 'carol_finance', 'david_campus', 'emma_allround');

-- Create some sample learning materials for testing
INSERT INTO public.materials (id, user_id, title, content, file_url, created_at, progress)
VALUES 
  ('material-1', 'user1-test-id', 'Introduction to Machine Learning', 'Basic concepts and algorithms in ML', NULL, NOW() - INTERVAL '2 days', 75),
  ('material-2', 'user2-test-id', 'Business Strategy Fundamentals', 'Core principles of business strategy', NULL, NOW() - INTERVAL '3 days', 90),
  ('material-3', 'user3-test-id', 'Cryptocurrency Basics', 'Understanding blockchain and digital currencies', NULL, NOW() - INTERVAL '1 day', 60),
  ('material-4', 'user5-test-id', 'Study Techniques', 'Effective methods for academic success', NULL, NOW() - INTERVAL '4 days', 85)
ON CONFLICT (id) DO NOTHING;

-- Add some sample financial transactions
INSERT INTO public.wallets (id, user_id, public_key, balance, token, created_at)
VALUES 
  ('wallet-1', 'user3-test-id', 'test-public-key-1', 150.75, 'USDC', NOW() - INTERVAL '5 days'),
  ('wallet-2', 'user4-test-id', 'test-public-key-2', 0.5, 'SOL', NOW() - INTERVAL '3 days'),
  ('wallet-3', 'user5-test-id', 'test-public-key-3', 200.00, 'USDC', NOW() - INTERVAL '7 days')
ON CONFLICT (id) DO NOTHING;

-- Refresh materialized views if they exist
-- Note: These commands might fail if the views don't exist yet, which is fine
DO $$
BEGIN
  -- Refresh leaderboard view if it exists
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'leaderboard_view') THEN
    REFRESH MATERIALIZED VIEW leaderboard_view;
  END IF;
  
  -- Refresh user stats view if it exists
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'user_stats_view') THEN
    REFRESH MATERIALIZED VIEW user_stats_view;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore errors if views don't exist
    NULL;
END $$;

-- Display summary of seeded data
SELECT 
  'XP Data' as category,
  COUNT(*) as count,
  SUM(total_xp) as total_xp
FROM public.user_xp
UNION ALL
SELECT 
  'Badges' as category,
  COUNT(*) as count,
  NULL as total_xp
FROM public.badges
UNION ALL
SELECT 
  'User Badges' as category,
  COUNT(*) as count,
  NULL as total_xp
FROM public.user_badges
UNION ALL
SELECT 
  'XP Activities' as category,
  COUNT(*) as count,
  SUM(xp_amount) as total_xp
FROM public.xp_activities
UNION ALL
SELECT 
  'Clubs' as category,
  COUNT(*) as count,
  NULL as total_xp
FROM public.clubs
UNION ALL
SELECT 
  'Club Members' as category,
  COUNT(*) as count,
  NULL as total_xp
FROM public.club_members;

-- Show current leaderboard
SELECT 
  u.username,
  u.full_name,
  ux.total_xp,
  ux.campus_xp,
  ux.learning_xp,
  ux.finance_xp,
  ux.club_xp,
  FLOOR(ux.total_xp / 100) + 1 as level,
  COUNT(ub.badge_id) as badges_earned
FROM public.user_xp ux
JOIN public.users u ON u.id = ux.user_id
LEFT JOIN public.user_badges ub ON ub.user_id = ux.user_id
GROUP BY u.username, u.full_name, ux.total_xp, ux.campus_xp, ux.learning_xp, ux.finance_xp, ux.club_xp
ORDER BY ux.total_xp DESC;