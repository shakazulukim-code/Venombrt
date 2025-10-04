import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ShieldCheck, Users, Package, Wallet, TrendingUp } from "lucide-react";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalOrders: 0, pendingOrders: 0, totalRevenue: 0, activeProducts: 0 });
  
  const [openProductDialog, setOpenProductDialog] = useState(false);
  const [openAddressDialog, setOpenAddressDialog] = useState(false);
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
  
  const [newProduct, setNewProduct] = useState({
    title: "",
    description: "",
    short_description: "",
    price_usd: "",
    stock: "",
    category_id: "",
    screenshot_url: ""
  });
  
  const [newAddress, setNewAddress] = useState({
    currency: "",
    address: "",
    label: ""
  });
  
  const [newCategory, setNewCategory] = useState({
    name: "",
    slug: "",
    description: ""
  });

  const [settings, setSettings] = useState<any[]>([]);
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});
  const [cryptoRates, setCryptoRates] = useState<any[]>([]);
  
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [editingRate, setEditingRate] = useState<any>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (data?.role !== 'admin') {
      toast.error('Access denied');
      navigate('/');
      return;
    }

    fetchData();
  };

  const fetchData = async () => {
    const [ordersRes, productsRes, addressesRes, usersRes, categoriesRes, settingsRes, ratesRes] = await Promise.all([
      supabase.from('orders').select('*, products(title)').order('created_at', { ascending: false }),
      supabase.from('products').select('*, categories(name)').order('created_at', { ascending: false }),
      supabase.from('deposit_addresses').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('sort_order', { ascending: true }),
      supabase.from('settings').select('*'),
      supabase.from('crypto_rates').select('*').order('currency', { ascending: true }),
    ]);

    if (ordersRes.data) {
      setOrders(ordersRes.data);
      const pending = ordersRes.data.filter((o: any) => ['awaiting_payment', 'paid', 'verified'].includes(o.status)).length;
      const revenue = ordersRes.data.reduce((sum: number, o: any) => sum + Number(o.total_usd), 0);
      setStats(prev => ({ ...prev, totalOrders: ordersRes.data.length, pendingOrders: pending, totalRevenue: revenue }));
    }

    if (productsRes.data) {
      setProducts(productsRes.data);
      const active = productsRes.data.filter((p: any) => p.status === 'available' && p.stock > 0).length;
      setStats(prev => ({ ...prev, activeProducts: active }));
    }

    if (addressesRes.data) setAddresses(addressesRes.data);
    if (usersRes.data) setUsers(usersRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);
    
    if (settingsRes.data) {
      setSettings(settingsRes.data);
      const map: Record<string, string> = {};
      settingsRes.data.forEach((setting: any) => {
        map[setting.key] = setting.value;
      });
      setSettingsMap(map);
    }
    
    if (ratesRes.data) setCryptoRates(ratesRes.data);

    setLoading(false);
  };
  
  const addProduct = async () => {
    if (!newProduct.title || !newProduct.description || !newProduct.price_usd || !newProduct.stock) {
      toast.error('Please fill in all required fields');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    const { error } = await supabase.from('products').insert({
      title: newProduct.title,
      description: newProduct.description,
      short_description: newProduct.short_description,
      price_usd: parseFloat(newProduct.price_usd),
      stock: parseInt(newProduct.stock),
      category_id: newProduct.category_id || null,
      screenshot_url: newProduct.screenshot_url || null,
      created_by: session?.user?.id,
      status: 'available'
    });

    if (error) {
      toast.error('Failed to add product');
      console.error(error);
    } else {
      toast.success('Product added successfully');
      setOpenProductDialog(false);
      setNewProduct({
        title: "",
        description: "",
        short_description: "",
        price_usd: "",
        stock: "",
        category_id: "",
        screenshot_url: ""
      });
      fetchData();
    }
  };
  
  const addAddress = async () => {
    if (!newAddress.currency || !newAddress.address) {
      toast.error('Please fill in currency and address');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    const { error } = await supabase.from('deposit_addresses').insert({
      currency: newAddress.currency.toUpperCase(),
      address: newAddress.address,
      label: newAddress.label,
      network: (newAddress as any).network || null,
      created_by: session?.user?.id,
      active: true
    });

    if (error) {
      toast.error('Failed to add address');
      console.error(error);
    } else {
      toast.success('Address added successfully');
      setOpenAddressDialog(false);
      setNewAddress({
        currency: "",
        address: "",
        label: ""
      });
      fetchData();
    }
  };

  const addCategory = async () => {
    if (!newCategory.name || !newCategory.slug) {
      toast.error('Please fill in name and slug');
      return;
    }

    const { error } = await supabase.from('categories').insert({
      name: newCategory.name,
      slug: newCategory.slug.toLowerCase().replace(/\s+/g, '-'),
      description: newCategory.description || null
    });

    if (error) {
      toast.error('Failed to add category');
      console.error(error);
    } else {
      toast.success('Category added successfully');
      setOpenCategoryDialog(false);
      setNewCategory({
        name: "",
        slug: "",
        description: ""
      });
      fetchData();
    }
  };

  const updateSetting = async (key: string, value: string) => {
    const { error } = await supabase
      .from('settings')
      .update({ value })
      .eq('key', key);

    if (error) {
      toast.error(`Failed to update ${key}`);
      console.error(error);
    } else {
      toast.success('Setting updated successfully');
      setSettingsMap({ ...settingsMap, [key]: value });
      fetchData();
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete product');
    } else {
      toast.success('Product deleted');
      fetchData();
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete category');
    } else {
      toast.success('Category deleted');
      fetchData();
    }
  };

  const deleteAddress = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    
    const { error } = await supabase.from('deposit_addresses').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete address');
    } else {
      toast.success('Address deleted');
      fetchData();
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (error) {
      toast.error('Failed to update order status');
    } else {
      toast.success('Order status updated');
      fetchData();
    }
  };

  const releaseOrder = async (orderId: string, productId: string) => {
    // Get an available credential for the product
    const { data: credential } = await supabase
      .from('account_credentials')
      .select('*')
      .eq('product_id', productId)
      .eq('status', 'available')
      .limit(1)
      .single();

    if (!credential) {
      toast.error('No credentials available');
      return;
    }

    // Update credential and order
    const [credUpdate, orderUpdate] = await Promise.all([
      supabase
        .from('account_credentials')
        .update({ status: 'released', assigned_order_id: orderId })
        .eq('id', credential.id),
      supabase
        .from('orders')
        .update({ status: 'released' })
        .eq('id', orderId),
    ]);

    if (credUpdate.error || orderUpdate.error) {
      toast.error('Error releasing order');
    } else {
      toast.success('Order released successfully');
      fetchData();
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-12">
          <div className="text-center py-12 text-muted-foreground">Loading admin panel...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex items-center gap-3 mb-8">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage your marketplace</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{stats.totalOrders}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent" />
                <span className="text-2xl font-bold">{stats.pendingOrders}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-success" />
                <span className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{stats.activeProducts}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="addresses">Crypto Addresses</TabsTrigger>
            <TabsTrigger value="rates">Crypto Rates</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <Card className="bg-gradient-card border-border">
              <CardHeader>
                <CardTitle>Order Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>{order.user_id}</TableCell>
                        <TableCell>{order.products?.title}</TableCell>
                        <TableCell>${order.total_usd}</TableCell>
                        <TableCell>
                          <Select
                            value={order.status}
                            onValueChange={(value) => updateOrderStatus(order.id, value)}
                          >
                            <SelectTrigger className="w-[160px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="awaiting_payment">Awaiting Payment</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                              <SelectItem value="verified">Verified</SelectItem>
                              <SelectItem value="released">Released</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {order.status === 'paid' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => releaseOrder(order.id, order.product_id)}
                            >
                              Release
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card className="bg-gradient-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Product Management</CardTitle>
                  <Dialog open={openProductDialog} onOpenChange={setOpenProductDialog}>
                    <DialogTrigger asChild>
                      <Button variant="gradient">Add Product</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add New Product</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="title">Title *</Label>
                          <Input
                            id="title"
                            value={newProduct.title}
                            onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })}
                            placeholder="Product title"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="short_description">Short Description</Label>
                          <Input
                            id="short_description"
                            value={newProduct.short_description}
                            onChange={(e) => setNewProduct({ ...newProduct, short_description: e.target.value })}
                            placeholder="Brief description"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">Full Description *</Label>
                          <Textarea
                            id="description"
                            value={newProduct.description}
                            onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                            placeholder="Detailed description"
                            rows={4}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="price">Price (USD) *</Label>
                            <Input
                              id="price"
                              type="number"
                              step="0.01"
                              value={newProduct.price_usd}
                              onChange={(e) => setNewProduct({ ...newProduct, price_usd: e.target.value })}
                              placeholder="0.00"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="stock">Stock *</Label>
                            <Input
                              id="stock"
                              type="number"
                              value={newProduct.stock}
                              onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                              placeholder="0"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="category">Category</Label>
                          <Select
                            value={newProduct.category_id}
                            onValueChange={(value) => setNewProduct({ ...newProduct, category_id: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="screenshot">Screenshot URL</Label>
                          <Input
                            id="screenshot"
                            value={newProduct.screenshot_url}
                            onChange={(e) => setNewProduct({ ...newProduct, screenshot_url: e.target.value })}
                            placeholder="https://..."
                          />
                        </div>
                        <Button onClick={addProduct} className="w-full" variant="gradient">
                          Add Product
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.title}</TableCell>
                        <TableCell>{product.categories?.name || 'N/A'}</TableCell>
                        <TableCell>${product.price_usd}</TableCell>
                        <TableCell>{product.stock}</TableCell>
                        <TableCell><Badge>{product.status}</Badge></TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteProduct(product.id)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <Card className="bg-gradient-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Category Management</CardTitle>
                  <Dialog open={openCategoryDialog} onOpenChange={setOpenCategoryDialog}>
                    <DialogTrigger asChild>
                      <Button variant="gradient">Add Category</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Category</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="cat-name">Category Name *</Label>
                          <Input
                            id="cat-name"
                            value={newCategory.name}
                            onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                            placeholder="e.g., Streaming Services"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cat-slug">Slug *</Label>
                          <Input
                            id="cat-slug"
                            value={newCategory.slug}
                            onChange={(e) => setNewCategory({ ...newCategory, slug: e.target.value })}
                            placeholder="e.g., streaming-services"
                          />
                          <p className="text-xs text-muted-foreground">
                            URL-friendly identifier (will be auto-formatted)
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cat-description">Description</Label>
                          <Textarea
                            id="cat-description"
                            value={newCategory.description}
                            onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                            placeholder="Brief description of the category"
                            rows={3}
                          />
                        </div>
                        <Button onClick={addCategory} className="w-full" variant="gradient">
                          Add Category
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell><Badge variant="outline">{category.slug}</Badge></TableCell>
                        <TableCell>{category.description || 'N/A'}</TableCell>
                        <TableCell>{new Date(category.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteCategory(category.id)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="addresses">
            <Card className="bg-gradient-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Crypto Payment Addresses</CardTitle>
                  <Dialog open={openAddressDialog} onOpenChange={setOpenAddressDialog}>
                    <DialogTrigger asChild>
                      <Button variant="gradient">Add Address</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Crypto Address</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="currency">Currency *</Label>
                          <Select
                            value={newAddress.currency}
                            onValueChange={(value) => setNewAddress({ ...newAddress, currency: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                              <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                              <SelectItem value="USDT">Tether (USDT)</SelectItem>
                              <SelectItem value="LTC">Litecoin (LTC)</SelectItem>
                              <SelectItem value="TRX">Tron (TRX)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="address">Wallet Address *</Label>
                          <Input
                            id="address"
                            value={newAddress.address}
                            onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                            placeholder="Enter wallet address"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="label">Label</Label>
                          <Input
                            id="label"
                            value={newAddress.label}
                            onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                            placeholder="e.g., Main wallet"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="network">Network</Label>
                          <Input
                            id="network"
                            value={(newAddress as any).network || ''}
                            onChange={(e) => setNewAddress({ ...newAddress, network: e.target.value } as any)}
                            placeholder="e.g., TRC20, ERC20, BEP20"
                          />
                          <p className="text-xs text-muted-foreground">
                            Specify the blockchain network (e.g., TRC20 for Tron, ERC20 for Ethereum)
                          </p>
                        </div>
                        <Button onClick={addAddress} className="w-full" variant="gradient">
                          Add Address
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Currency</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Network</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {addresses.map((address) => (
                      <TableRow key={address.id}>
                        <TableCell><Badge variant="outline">{address.currency}</Badge></TableCell>
                        <TableCell className="font-mono text-sm">{address.address}</TableCell>
                        <TableCell>{address.network || 'N/A'}</TableCell>
                        <TableCell>{address.label}</TableCell>
                        <TableCell>
                          <Badge variant={address.active ? 'default' : 'secondary'}>
                            {address.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteAddress(address.id)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rates">
            <Card className="bg-gradient-card border-border">
              <CardHeader>
                <CardTitle>Crypto Exchange Rates (USD)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Currency</TableHead>
                      <TableHead>Rate (USD)</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cryptoRates.map((rate) => (
                      <TableRow key={rate.id}>
                        <TableCell>
                          <Badge className="text-base">{rate.currency}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-lg font-semibold">
                          ${parseFloat(rate.rate_usd).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {new Date(rate.updated_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              placeholder="New rate"
                              className="w-32"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const newRate = (e.target as HTMLInputElement).value;
                                  if (newRate) {
                                    supabase
                                      .from('crypto_rates')
                                      .update({ rate_usd: parseFloat(newRate) })
                                      .eq('id', rate.id)
                                      .then(({ error }) => {
                                        if (error) {
                                          toast.error('Failed to update rate');
                                        } else {
                                          toast.success('Rate updated');
                                          fetchData();
                                          (e.target as HTMLInputElement).value = '';
                                        }
                                      });
                                  }
                                }
                              }}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="bg-gradient-card border-border">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="bg-gradient-card border-border">
              <CardHeader>
                <CardTitle>Contact & Notification Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6 max-w-2xl">
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp_url">WhatsApp Contact URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="whatsapp_url"
                        value={settingsMap['whatsapp_url'] || ''}
                        onChange={(e) => setSettingsMap({ ...settingsMap, whatsapp_url: e.target.value })}
                        placeholder="https://wa.me/1234567890"
                      />
                      <Button
                        onClick={() => updateSetting('whatsapp_url', settingsMap['whatsapp_url'])}
                        variant="outline"
                      >
                        Save
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Format: https://wa.me/your-phone-number</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telegram_url">Telegram Contact URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="telegram_url"
                        value={settingsMap['telegram_url'] || ''}
                        onChange={(e) => setSettingsMap({ ...settingsMap, telegram_url: e.target.value })}
                        placeholder="https://t.me/yourusername"
                      />
                      <Button
                        onClick={() => updateSetting('telegram_url', settingsMap['telegram_url'])}
                        variant="outline"
                      >
                        Save
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Format: https://t.me/yourusername</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telegram_bot_token">Telegram Bot Token</Label>
                    <div className="flex gap-2">
                      <Input
                        id="telegram_bot_token"
                        type="password"
                        value={settingsMap['telegram_bot_token'] || ''}
                        onChange={(e) => setSettingsMap({ ...settingsMap, telegram_bot_token: e.target.value })}
                        placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                      />
                      <Button
                        onClick={() => updateSetting('telegram_bot_token', settingsMap['telegram_bot_token'])}
                        variant="outline"
                      >
                        Save
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Get from @BotFather on Telegram</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telegram_chat_id">Telegram Chat ID</Label>
                    <div className="flex gap-2">
                      <Input
                        id="telegram_chat_id"
                        value={settingsMap['telegram_chat_id'] || ''}
                        onChange={(e) => setSettingsMap({ ...settingsMap, telegram_chat_id: e.target.value })}
                        placeholder="-1001234567890"
                      />
                      <Button
                        onClick={() => updateSetting('telegram_chat_id', settingsMap['telegram_chat_id'])}
                        variant="outline"
                      >
                        Save
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Your personal or group chat ID for order notifications</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
