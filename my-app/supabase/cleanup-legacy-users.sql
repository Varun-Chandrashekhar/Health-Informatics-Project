-- Archive/delete legacy test users and all their associated data
-- Run this in the Supabase SQL Editor
-- Order: messages → sessions → users (respects foreign keys)

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
