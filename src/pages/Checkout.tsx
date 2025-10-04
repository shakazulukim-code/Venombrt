import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Bitcoin, Wallet } from "lucide-react";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
import { QRCodeSVG } from 'qrcode.react';

interface DepositAddress {
  id: string;
  currency: string;
  address: string;
  network: string | null;
  label: string | null;
}

interface CryptoRate {
  currency: string;
  rate_usd: number;
}

const Checkout = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [addresses, setAddresses] = useState<DepositAddress[]>([]);
  const [cryptoRates, setCryptoRates] = useState<CryptoRate[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('BTC');
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    fetchProduct();
    fetchAddresses();
    fetchCryptoRates();
  }, [productId]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      toast.error('Payment window expired. Please try again.');
      navigate(`/product/${productId}`);
    }
  }, [timeLeft]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    }
  };

  const fetchProduct = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (error) {
      toast.error('Product not found');
      navigate('/shop');
    } else {
      setProduct(data);
      createOrder(data);
    }
  };

  const fetchAddresses = async () => {
    const { data } = await supabase
      .from('deposit_addresses')
      .select('*')
      .eq('active', true);

    if (data) setAddresses(data);
  };

  const fetchCryptoRates = async () => {
    const { data } = await supabase
      .from('crypto_rates')
      .select('*');

    if (data) setCryptoRates(data);
  };

  const getCryptoAmount = (usdAmount: number, currency: string): number => {
    const rate = cryptoRates.find(r => r.currency === currency);
    if (!rate) return 0;
    return usdAmount / rate.rate_usd;
  };

  const createOrder = async (product: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const reservedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const cryptoAmount = getCryptoAmount(product.price_usd, selectedCurrency);

    const { data, error } = await supabase
      .from('orders')
      .insert({
        user_id: session.user.id,
        product_id: product.id,
        quantity: 1,
        total_usd: product.price_usd,
        currency: selectedCurrency,
        amount_crypto: Number(cryptoAmount.toFixed(8)),
        status: 'awaiting_payment',
        reserved_until: reservedUntil.toISOString(),
      } as any)
      .select()
      .single();

    if (data) setOrderId(data.id);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Address copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePaymentConfirm = async () => {
    if (!orderId) return;

    const { error } = await supabase
      .from('orders')
      .update({ status: 'paid' })
      .eq('id', orderId);

    if (error) {
      toast.error('Error confirming payment');
    } else {
      toast.success('Payment notification sent! Admin will verify shortly.');
      navigate('/dashboard');
    }
  };

  const selectedAddress = addresses.find(a => a.currency === selectedCurrency);
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  if (!product) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Complete Your Purchase</h1>
          <p className="text-muted-foreground">Payment window expires in {minutes}:{seconds.toString().padStart(2, '0')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-gradient-card border-border">
              <CardHeader>
                <CardTitle>Select Cryptocurrency</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {addresses.filter((addr, index, self) => 
                    index === self.findIndex(a => a.currency === addr.currency)
                  ).map(address => (
                    <Button
                      key={address.currency}
                      variant={selectedCurrency === address.currency ? 'default' : 'outline'}
                      onClick={() => setSelectedCurrency(address.currency)}
                      className="h-auto py-4"
                    >
                      <div className="text-center">
                        <Bitcoin className="h-6 w-6 mx-auto mb-2" />
                        <span className="font-semibold">{address.currency}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {selectedAddress && (
              <Card className="bg-gradient-card border-border">
                <CardHeader>
                  <CardTitle>Payment Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex justify-center p-6 bg-background rounded-lg">
                    <QRCodeSVG value={selectedAddress.address} size={200} />
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">
                      Wallet Address:
                    </label>
                    <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg">
                      <code className="flex-1 text-sm break-all">{selectedAddress.address}</code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(selectedAddress.address)}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    {selectedAddress.network && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">
                          Network: {selectedAddress.network}
                        </Badge>
                      </div>
                    )}
                    {selectedAddress.label && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedAddress.label}
                      </p>
                    )}
                  </div>

                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Send Exactly:</span>
                    </div>
                    <p className="text-2xl font-bold text-primary">
                      {getCryptoAmount(product.price_usd, selectedCurrency).toFixed(8)} {selectedCurrency}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      for a total of ${product.price_usd} USD
                    </p>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    variant="gradient"
                    onClick={handlePaymentConfirm}
                  >
                    I've Sent the Payment
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="bg-gradient-card border-border">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Product</p>
                  <p className="font-semibold">{product.title}</p>
                </div>

                <div className="h-px bg-border" />

                <div>
                  <p className="text-sm text-muted-foreground">Quantity</p>
                  <p className="font-semibold">1 Account</p>
                </div>

                <div className="h-px bg-border" />

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total</p>
                  <p className="text-2xl font-bold text-primary">${product.price_usd}</p>
                </div>

                <Badge variant="secondary" className="w-full justify-center py-2">
                  Instant Delivery
                </Badge>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border">
              <CardContent className="p-4 text-sm text-muted-foreground">
                <p className="mb-2">⚡ After payment confirmation:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Admin will verify transaction</li>
                  <li>Credentials released to your dashboard</li>
                  <li>Usually within 15-30 minutes</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Checkout;
