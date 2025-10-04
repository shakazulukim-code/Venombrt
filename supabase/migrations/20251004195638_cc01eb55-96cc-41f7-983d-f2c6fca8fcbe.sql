-- Add foreign key relationship between orders and profiles (auth.users)
-- Note: We reference auth.users directly as that's where user_id points to

-- Add sort_order to categories for ordering
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON public.categories(sort_order);

-- Update crypto_rates table to ensure we have common cryptocurrencies
INSERT INTO public.crypto_rates (currency, rate_usd) VALUES
  ('BTC', 95000),
  ('ETH', 3500),
  ('USDT', 1)
ON CONFLICT (currency) DO UPDATE SET rate_usd = EXCLUDED.rate_usd;