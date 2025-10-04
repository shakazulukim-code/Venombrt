import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Shield, Zap, Clock } from "lucide-react";
import Navbar from "@/components/Navbar";
import heroImage from "@/assets/hero-bg.jpg";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={heroImage} alt="Hero" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 to-background" />
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
            Premium Digital Accounts
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Buy verified accounts with cryptocurrency. Secure, instant, and anonymous.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/shop">
              <Button size="lg" variant="gradient" className="text-lg">
                <ShoppingBag className="h-5 w-5" />
                Browse Accounts
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="text-lg">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="inline-flex p-4 rounded-lg bg-primary/10 mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Secure & Verified</h3>
            <p className="text-muted-foreground">All accounts verified and guaranteed to work</p>
          </div>
          
          <div className="text-center p-6">
            <div className="inline-flex p-4 rounded-lg bg-accent/10 mb-4">
              <Zap className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Instant Delivery</h3>
            <p className="text-muted-foreground">Get your credentials after payment verification</p>
          </div>
          
          <div className="text-center p-6">
            <div className="inline-flex p-4 rounded-lg bg-success/10 mb-4">
              <Clock className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-xl font-semibold mb-2">24/7 Support</h3>
            <p className="text-muted-foreground">Always here to help with your purchases</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
