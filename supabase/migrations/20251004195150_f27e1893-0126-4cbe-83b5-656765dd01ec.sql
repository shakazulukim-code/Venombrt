-- Create settings table for contact info and configs
CREATE TABLE public.settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  description text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Policies for settings
CREATE POLICY "Anyone can view settings"
ON public.settings
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage settings"
ON public.settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default contact settings
INSERT INTO public.settings (key, value, description) VALUES
  ('whatsapp_url', 'https://wa.me/1234567890', 'WhatsApp contact link'),
  ('telegram_url', 'https://t.me/yourusername', 'Telegram contact link');

-- Add network field to deposit_addresses
ALTER TABLE public.deposit_addresses
ADD COLUMN network text;

-- Create crypto_rates table for price management
CREATE TABLE public.crypto_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  currency text NOT NULL UNIQUE,
  rate_usd numeric NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.crypto_rates ENABLE ROW LEVEL SECURITY;

-- Policies for crypto_rates
CREATE POLICY "Anyone can view rates"
ON public.crypto_rates
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage rates"
ON public.crypto_rates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default rates
INSERT INTO public.crypto_rates (currency, rate_usd) VALUES
  ('BTC', 50000),
  ('ETH', 3000),
  ('USDT', 1);

-- Add trigger for settings updated_at
CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Add trigger for crypto_rates updated_at
CREATE TRIGGER update_crypto_rates_updated_at
BEFORE UPDATE ON public.crypto_rates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();