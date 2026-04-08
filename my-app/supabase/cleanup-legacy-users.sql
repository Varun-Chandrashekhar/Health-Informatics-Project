-- Archive/delete legacy test users and all their associated data
-- Run this in the Supabase SQL Editor
-- Order: messages → sessions → users (respects foreign keys)

-- Legacy test users (old names)
DELETE FROM messages WHERE user_id IN (
  'participant1', 'participant2', 'participant3', 'participant4',
  'participant5', 'participant6', 'participant7', 'participant8',
  'rugved', 'summary_test_user', 'test_exp_user',
  'varun', 'varun1', 'varun7',
  'local_test_bot', 'local_test_bot_final', 'local_test_bot2',
  'memory_test_user', 'mengting', 'onboard_test_user'
);

DELETE FROM sessions WHERE user_id IN (
  'participant1', 'participant2', 'participant3', 'participant4',
  'participant5', 'participant6', 'participant7', 'participant8',
  'rugved', 'summary_test_user', 'test_exp_user',
  'varun', 'varun1', 'varun7',
  'local_test_bot', 'local_test_bot_final', 'local_test_bot2',
  'memory_test_user', 'mengting', 'onboard_test_user'
);

DELETE FROM users WHERE user_id IN (
  'participant1', 'participant2', 'participant3', 'participant4',
  'participant5', 'participant6', 'participant7', 'participant8',
  'rugved', 'summary_test_user', 'test_exp_user',
  'varun', 'varun1', 'varun7',
  'local_test_bot', 'local_test_bot_final', 'local_test_bot2',
  'memory_test_user', 'mengting', 'onboard_test_user'
);

-- Remove old lowercase p01–p10 accounts (replaced by uppercase P01–P20)
DELETE FROM messages WHERE user_id IN (
  'p01', 'p02', 'p03', 'p04', 'p05',
  'p06', 'p07', 'p08', 'p09', 'p10'
);

DELETE FROM sessions WHERE user_id IN (
  'p01', 'p02', 'p03', 'p04', 'p05',
  'p06', 'p07', 'p08', 'p09', 'p10'
);

DELETE FROM users WHERE user_id IN (
  'p01', 'p02', 'p03', 'p04', 'p05',
  'p06', 'p07', 'p08', 'p09', 'p10'
);

-- Remove e01–e10 accounts (eliminated from study design)
DELETE FROM messages WHERE user_id IN (
  'e01', 'e02', 'e03', 'e04', 'e05',
  'e06', 'e07', 'e08', 'e09', 'e10'
);

DELETE FROM sessions WHERE user_id IN (
  'e01', 'e02', 'e03', 'e04', 'e05',
  'e06', 'e07', 'e08', 'e09', 'e10'
);

DELETE FROM users WHERE user_id IN (
  'e01', 'e02', 'e03', 'e04', 'e05',
  'e06', 'e07', 'e08', 'e09', 'e10'
);
