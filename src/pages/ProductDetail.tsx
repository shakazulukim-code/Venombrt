import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Package, Shield, Clock } from "lucide-react";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";

interface Product {
  id: string;
  title: string;
  description: string;
  short_description: string;
  price_usd: number;
  screenshot_url: string;
  stock: number;
  categories: { name: string } | null;
}

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    fetchProduct();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, [id]);

  const fetchProduct = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching product:', error);
      toast.error('Product not found');
      navigate('/shop');
    } else {
      setProduct(data);
    }
    setLoading(false);
  };

  const handleBuyClick = () => {
    if (!session) {
      toast.error('Please sign in to purchase');
      navigate('/auth');
      return;
    }
    navigate(`/checkout/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-12">
          <div className="animate-pulse">
            <div className="h-96 bg-muted rounded-lg mb-8" />
            <div className="h-8 bg-muted rounded w-1/3 mb-4" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div className="rounded-lg overflow-hidden bg-muted">
            {product.screenshot_url ? (
              <img
                src={product.screenshot_url}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-96 flex items-center justify-center">
                <Package className="h-24 w-24 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              {product.categories && (
                <Badge variant="secondary" className="mb-2">
                  {product.categories.name}
                </Badge>
              )}
              <h1 className="text-4xl font-bold mb-4">{product.title}</h1>
              <p className="text-lg text-muted-foreground">{product.short_description}</p>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-primary">${product.price_usd}</span>
              <span className="text-muted-foreground">USD</span>
            </div>

            <Card className="bg-gradient-card border-border">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-success" />
                  <span className="text-sm">Verified account with instant delivery</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-success" />
                  <span className="text-sm">Credentials released after payment verification</span>
                </div>
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-success" />
                  <span className="text-sm">{product.stock} accounts available</span>
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full"
              size="lg"
              variant="gradient"
              onClick={handleBuyClick}
              disabled={product.stock === 0}
            >
              <ShoppingCart className="h-5 w-5" />
              {product.stock > 0 ? 'Buy Now' : 'Out of Stock'}
            </Button>
          </div>
        </div>

        <div className="max-w-3xl">
          <h2 className="text-2xl font-bold mb-4">Description</h2>
          <div className="prose prose-invert max-w-none">
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {product.description}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProductDetail;
