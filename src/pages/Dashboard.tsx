import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Clock, CheckCircle, Copy } from "lucide-react";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";

interface Order {
  id: string;
  status: string;
  total_usd: number;
  currency: string;
  created_at: string;
  products: {
    title: string;
  };
}

interface ReleasedCredential {
  order_id: string;
  username: string;
  password: string;
  notes: string;
  product_title: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [credentials, setCredentials] = useState<ReleasedCredential[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchOrders();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    }
  };

  const fetchOrders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: ordersData } = await supabase
      .from('orders')
      .select('*, products(title)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (ordersData) {
      setOrders(ordersData);

      // Fetch credentials for released orders
      const releasedOrderIds = ordersData
        .filter(o => o.status === 'released')
        .map(o => o.id);

      if (releasedOrderIds.length > 0) {
        const { data: credsData } = await supabase
          .from('account_credentials')
          .select('*, products(title)')
          .in('assigned_order_id', releasedOrderIds)
          .eq('status', 'released');

        if (credsData) {
          setCredentials(credsData.map(c => ({
            order_id: c.assigned_order_id,
            username: c.username,
            password: c.password,
            notes: c.notes,
            product_title: c.products?.title || '',
          })));
        }
      }
    }

    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      awaiting_payment: 'secondary',
      paid: 'outline',
      verified: 'outline',
      released: 'default',
      cancelled: 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status.replace('_', ' ')}</Badge>;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const stats = {
    total: orders.length,
    pending: orders.filter(o => ['awaiting_payment', 'paid', 'verified'].includes(o.status)).length,
    completed: orders.filter(o => o.status === 'released').length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Dashboard</h1>
          <p className="text-muted-foreground">Manage your orders and account credentials</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{stats.total}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-accent" />
                <span className="text-2xl font-bold">{stats.pending}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span className="text-2xl font-bold">{stats.completed}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {credentials.length > 0 && (
          <Card className="mb-8 bg-gradient-card border-border">
            <CardHeader>
              <CardTitle>Your Accounts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {credentials.map((cred, index) => (
                <Card key={index} className="bg-secondary/50 border-border">
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-3">{cred.product_title}</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-background rounded">
                        <div>
                          <span className="text-xs text-muted-foreground">Username</span>
                          <p className="font-mono">{cred.username}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(cred.username, 'Username')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-background rounded">
                        <div>
                          <span className="text-xs text-muted-foreground">Password</span>
                          <p className="font-mono">{cred.password}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(cred.password, 'Password')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      {cred.notes && (
                        <div className="p-2 bg-background rounded">
                          <span className="text-xs text-muted-foreground">Notes</span>
                          <p className="text-sm">{cred.notes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle>Order History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No orders yet</p>
                <Button onClick={() => navigate('/shop')} variant="gradient">
                  Browse Products
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.products.title}</TableCell>
                      <TableCell>${order.total_usd}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
