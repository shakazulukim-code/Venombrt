-- Add Telegram bot settings
INSERT INTO public.settings (key, value, description) VALUES
  ('telegram_bot_token', '', 'Telegram bot token for order notifications'),
  ('telegram_chat_id', '', 'Telegram chat ID for order notifications')
ON CONFLICT (key) DO NOTHING;