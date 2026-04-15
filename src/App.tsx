/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { 
  Plus, 
  Search, 
  Truck, 
  MapPin, 
  User as UserIcon, 
  FileText, 
  Calendar as CalendarIcon, 
  Trash2, 
  Edit2,
  Filter,
  ArrowUpDown,
  ChevronRight,
  Package,
  Hash,
  LogIn,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  ClipboardList,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from 'firebase/auth';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { routeService } from '@/services/routeService';
import { loadingService, LoadingCard } from '@/services/loadingService';
import { Route, RouteFormData, DeliveryDetail } from '@/types';
import { auth } from '@/firebase';

const INITIAL_DELIVERY: DeliveryDetail = {
  location: '',
  uf: '',
  region: '',
  clientName: '',
  orderNumber: '',
  invoiceNumber: '',
  status: 'pendente',
};

const INITIAL_FORM_DATA: RouteFormData = {
  routeNumber: '',
  type: 'nova',
  cargoType: 'consolidado',
  deliveries: [{ ...INITIAL_DELIVERY }],
  deliveryDate: new Date().toISOString().split('T')[0],
};

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<RouteFormData>(INITIAL_FORM_DATA);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUf, setFilterUf] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'logistica' | 'carregamento'>('logistica');
  const [loadingCards, setLoadingCards] = useState<LoadingCard[]>([]);
  const [loadingStats, setLoadingStats] = useState<any>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (user && activeTab === 'carregamento') {
      const fetchLoadingData = async () => {
        const data = await loadingService.getLoadingData();
        if (data) {
          setLoadingCards(data.cards);
          setLoadingStats(data.painel);
        }
      };
      fetchLoadingData();
      const interval = setInterval(fetchLoadingData, 10000);
      return () => clearInterval(interval);
    }
  }, [user, activeTab]);

  useEffect(() => {
    if (user) {
      const unsubscribeRoutes = routeService.subscribeToRoutes((updatedRoutes) => {
        setRoutes(updatedRoutes);
      });
      return () => unsubscribeRoutes();
    } else {
      setRoutes([]);
    }
  }, [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Erro ao fazer login:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDeliveryChange = (index: number, field: keyof DeliveryDetail, value: string) => {
    const newDeliveries = [...formData.deliveries];
    newDeliveries[index] = { ...newDeliveries[index], [field]: value };
    setFormData(prev => ({ ...prev, deliveries: newDeliveries }));
  };

  const addDelivery = () => {
    setFormData(prev => ({
      ...prev,
      deliveries: [...prev.deliveries, { ...INITIAL_DELIVERY }]
    }));
  };

  const removeDelivery = (index: number) => {
    if (formData.deliveries.length === 1) return;
    const newDeliveries = formData.deliveries.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, deliveries: newDeliveries }));
  };

  const handleTypeChange = (value: 'nova' | 'final_mes') => {
    setFormData(prev => ({ ...prev, type: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await routeService.updateRoute(editingId, formData);
      } else {
        await routeService.addRoute(formData);
      }
      handleCloseDialog();
      setIsSidebarOpen(false);
    } catch (error) {
      console.error("Erro ao salvar rota:", error);
      alert("Erro ao salvar rota. Verifique suas permissões.");
    }
  };

  const handleEdit = (route: Route) => {
    if (route.createdBy !== user?.uid) {
      alert("Você só pode editar rotas criadas por você.");
      return;
    }
    setFormData({
      routeNumber: route.routeNumber,
      type: route.type,
      cargoType: route.cargoType || 'consolidado',
      deliveries: route.deliveries,
      deliveryDate: route.deliveryDate,
    });
    setEditingId(route.id);
    setIsSidebarOpen(true);
  };

  const handleDelete = async (id: string, createdBy: string) => {
    if (createdBy !== user?.uid) {
      alert("Você só pode excluir rotas criadas por você.");
      return;
    }
    if (window.confirm('Tem certeza que deseja excluir esta rota?')) {
      try {
        await routeService.deleteRoute(id);
      } catch (error) {
        console.error("Erro ao excluir rota:", error);
      }
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setFormData(INITIAL_FORM_DATA);
    setEditingId(null);
  };

  const handleReleaseRoute = async (route: Route) => {
    if (window.confirm(`Deseja liberar a rota #${route.routeNumber} para o painel de carregamento?`)) {
      try {
        const success = await loadingService.releaseRoute(route);
        if (success) {
          await routeService.releaseRoute(route.id);
          alert("Rota liberada com sucesso!");
        } else {
          alert("Erro ao liberar rota. Verifique a configuração do Apps Script.");
        }
      } catch (error) {
        console.error("Erro ao liberar rota:", error);
      }
    }
  };

  const filteredRoutes = routes.filter(route => {
    const searchLower = searchTerm.toLowerCase();
    
    const matchesSearch = 
      route.routeNumber.toLowerCase().includes(searchLower) ||
      route.deliveries.some(d => 
        d.clientName.toLowerCase().includes(searchLower) ||
        d.invoiceNumber.toLowerCase().includes(searchLower) ||
        d.location.toLowerCase().includes(searchLower) ||
        d.region.toLowerCase().includes(searchLower) ||
        d.orderNumber.toLowerCase().includes(searchLower) ||
        d.uf.toLowerCase().includes(searchLower)
      );
    
    const matchesUf = filterUf === 'all' || route.deliveries.some(d => d.uf === filterUf);
    const matchesDate = !filterDate || route.deliveryDate === filterDate;
    
    return matchesSearch && matchesUf && matchesDate;
  });

  const routesNova = filteredRoutes.filter(r => r.type === 'nova');
  const routesAntiga = filteredRoutes.filter(r => r.type !== 'nova');

  const getCargoStats = (routeList: Route[]) => {
    return {
      plastico: routeList.filter(r => r.cargoType === 'plastico').length,
      porcelana: routeList.filter(r => r.cargoType === 'porcelana').length,
      consolidado: routeList.filter(r => r.cargoType === 'consolidado').length,
    };
  };

  const calculateLoadingPercentage = (routeList: Route[]) => {
    if (routeList.length === 0) return 0;
    const totalDeliveries = routeList.reduce((acc, r) => acc + r.deliveries.length, 0);
    const loadedDeliveries = routeList.reduce((acc, r) => 
      acc + r.deliveries.filter(d => d.status === 'carregado').length, 0
    );
    return Math.round((loadedDeliveries / totalDeliveries) * 100) || 0;
  };

  const stats = {
    total: routes.length,
    nova: {
      count: routes.filter(r => r.type === 'nova').length,
      cargo: getCargoStats(routes.filter(r => r.type === 'nova')),
      loading: calculateLoadingPercentage(routes.filter(r => r.type === 'nova')),
    },
    antiga: {
      count: routes.filter(r => r.type !== 'nova').length,
      cargo: getCargoStats(routes.filter(r => r.type !== 'nova')),
      loading: calculateLoadingPercentage(routes.filter(r => r.type !== 'nova')),
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Truck className="w-12 h-12 text-primary animate-bounce" />
          <p className="text-muted-foreground font-medium">Carregando sistema...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md border-border shadow-lg">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
              <Truck className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Logística Pro</CardTitle>
            <CardDescription>
              Acesse sua conta para gerenciar e visualizar as rotas logísticas em tempo real.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button onClick={handleLogin} className="w-full h-12 text-base font-bold gap-3">
              <LogIn className="w-5 h-5" />
              Entrar com Google
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Ao entrar, você concorda com os termos de uso do sistema.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-sans text-[13px]">
      {/* Sidebar - Form Area */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[320px] bg-white border-r border-border p-5 flex flex-col gap-4 overflow-y-auto transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 ${!isSidebarOpen && 'lg:hidden'}`}>
        <header className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-[16px] font-bold text-slate-900 tracking-tight leading-none">LOGÍSTICA</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Gestão de Rotas</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair" className="h-8 w-8 text-muted-foreground hover:text-destructive">
              <LogOut className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="lg:hidden h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </header>

        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-border mb-2">
          <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-white shadow-sm" />
          <div className="flex flex-col overflow-hidden">
            <span className="font-bold text-slate-900 truncate">{user.displayName}</span>
            <span className="text-[10px] text-muted-foreground truncate">{user.email}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-[11px] font-bold uppercase text-muted-foreground">Nº da Rota</Label>
              <Input 
                name="routeNumber" 
                value={formData.routeNumber} 
                onChange={handleInputChange} 
                placeholder="Ex: RT-9920" 
                className="h-9 text-[13px]"
                required 
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[11px] font-bold uppercase text-muted-foreground">Tipo</Label>
              <Select value={formData.type} onValueChange={(value: 'nova' | 'antiga') => setFormData(prev => ({ ...prev, type: value }))}>
                <SelectTrigger className="h-9 text-[13px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nova">Rota Nova</SelectItem>
                  <SelectItem value="antiga">Rota Antiga</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-[11px] font-bold uppercase text-muted-foreground">Carga</Label>
              <Select value={formData.cargoType} onValueChange={(value: 'plastico' | 'porcelana' | 'consolidado') => setFormData(prev => ({ ...prev, cargoType: value }))}>
                <SelectTrigger className="h-9 text-[13px]">
                  <SelectValue placeholder="Carga" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plastico">Plástico</SelectItem>
                  <SelectItem value="porcelana">Porcelana</SelectItem>
                  <SelectItem value="consolidado">Consolidado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[11px] font-bold uppercase text-muted-foreground">Data de Entrega</Label>
              <Input 
                name="deliveryDate" 
                type="date" 
                value={formData.deliveryDate} 
                onChange={handleInputChange} 
                className="h-9 text-[13px]"
                required 
              />
            </div>
          </div>

          <div className="space-y-4 mt-2">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-bold uppercase text-primary">Entregas ({formData.deliveries.length})</Label>
              <Button type="button" variant="outline" size="sm" onClick={addDelivery} className="h-7 px-2 text-[10px] font-bold gap-1">
                <Plus className="w-3 h-3" /> ADICIONAR
              </Button>
            </div>

            {formData.deliveries.map((delivery, index) => (
              <div key={index} className="p-3 border border-border rounded-lg bg-slate-50/50 space-y-3 relative group">
                {formData.deliveries.length > 1 && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeDelivery(index)}
                    className="absolute -top-2 -right-2 h-5 w-5 bg-white border border-border rounded-full text-destructive shadow-sm"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
                
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Local</Label>
                  <Input 
                    value={delivery.location} 
                    onChange={(e) => handleDeliveryChange(index, 'location', e.target.value)} 
                    placeholder="Local de Entrega" 
                    className="h-8 text-[12px]"
                    required 
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">UF</Label>
                    <Select value={delivery.uf} onValueChange={(val) => handleDeliveryChange(index, 'uf', val)} required>
                      <SelectTrigger className="h-8 text-[12px]">
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                      <SelectContent>
                        {UFS.map(uf => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Região</Label>
                    <Input 
                      value={delivery.region} 
                      onChange={(e) => handleDeliveryChange(index, 'region', e.target.value)} 
                      placeholder="Região" 
                      className="h-8 text-[12px]"
                      required 
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Cliente</Label>
                  <Input 
                    value={delivery.clientName} 
                    onChange={(e) => handleDeliveryChange(index, 'clientName', e.target.value)} 
                    placeholder="Nome do Cliente" 
                    className="h-8 text-[12px]"
                    required 
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Pedido</Label>
                    <Input 
                      value={delivery.orderNumber} 
                      onChange={(e) => handleDeliveryChange(index, 'orderNumber', e.target.value)} 
                      placeholder="#000" 
                      className="h-8 text-[12px]"
                      required 
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">NF</Label>
                    <Input 
                      value={delivery.invoiceNumber} 
                      onChange={(e) => handleDeliveryChange(index, 'invoiceNumber', e.target.value)} 
                      placeholder="#000" 
                      className="h-8 text-[12px]"
                      required 
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Status:</Label>
                  <Button 
                    type="button" 
                    variant={delivery.status === 'carregado' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleDeliveryChange(index, 'status', delivery.status === 'carregado' ? 'pendente' : 'carregado')}
                    className={`h-6 px-2 text-[9px] font-bold ${delivery.status === 'carregado' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  >
                    {delivery.status === 'carregado' ? 'CARREGADO' : 'PENDENTE'}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button type="submit" className="w-full h-10 font-bold text-[13px] mt-4">
            {editingId ? 'Salvar Alterações' : 'Finalizar Rota'}
          </Button>
          
          {editingId && (
            <Button type="button" variant="outline" onClick={handleCloseDialog} className="w-full h-10">
              Cancelar Edição
            </Button>
          )}
        </form>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-6 gap-5 overflow-hidden relative">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between mb-2">
          <Button variant="outline" size="icon" onClick={() => setIsSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            <span className="font-bold text-primary">LOGÍSTICA</span>
          </div>
          <div className="w-10" />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit mb-2">
          <Button 
            variant={activeTab === 'logistica' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setActiveTab('logistica')}
            className="h-8 px-4 text-[12px] font-bold gap-2"
          >
            <LayoutDashboard className="w-4 h-4" />
            LOGÍSTICA
          </Button>
          <Button 
            variant={activeTab === 'carregamento' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setActiveTab('carregamento')}
            className="h-8 px-4 text-[12px] font-bold gap-2"
          >
            <Truck className="w-4 h-4" />
            CARREGAMENTO
          </Button>
        </div>

        {activeTab === 'logistica' ? (
          <>
            {/* Stats Bar */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 bg-white border-border shadow-sm flex flex-col justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase text-muted-foreground mb-1">Total Geral</p>
                  <p className="text-[24px] font-bold text-slate-900">{stats.total}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-[11px]">
                  <span className="text-blue-600 font-bold">NOVAS: {stats.nova.count}</span>
                  <span className="text-orange-600 font-bold">ANTIGAS: {stats.antiga.count}</span>
                </div>
              </Card>

              <Card className="p-4 bg-white border-border shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase text-blue-600">Status Carregamento (Novas)</p>
                    <p className="text-[20px] font-bold text-slate-900">{stats.nova.loading}%</p>
                  </div>
                  <Badge className="bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-50">NOVAS</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px] font-bold uppercase">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Plástico</span>
                    <span className="text-slate-900">{stats.nova.cargo.plastico}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Porcelana</span>
                    <span className="text-slate-900">{stats.nova.cargo.porcelana}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Consol.</span>
                    <span className="text-slate-900">{stats.nova.cargo.consolidado}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-white border-border shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase text-orange-600">Status Carregamento (Antigas)</p>
                    <p className="text-[20px] font-bold text-slate-900">{stats.antiga.loading}%</p>
                  </div>
                  <Badge className="bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-50">ANTIGAS</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px] font-bold uppercase">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Plástico</span>
                    <span className="text-slate-900">{stats.antiga.cargo.plastico}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Porcelana</span>
                    <span className="text-slate-900">{stats.antiga.cargo.porcelana}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Consol.</span>
                    <span className="text-slate-900">{stats.antiga.cargo.consolidado}</span>
                  </div>
                </div>
              </Card>
            </section>

            {/* Search & Table Area */}
            <section className="flex-1 bg-white border border-border rounded-[10px] flex flex-col overflow-hidden">
              <div className="p-4 border-b border-border bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-[300px]">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="hidden lg:flex h-8 w-8" 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    title={isSidebarOpen ? "Esconder Menu" : "Mostrar Menu"}
                  >
                    <Menu className="w-4 h-4" />
                  </Button>
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar por rota, cliente, local, pedido ou nota..." 
                      className="pl-8 h-8 text-[12px] bg-white"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {(searchTerm || filterDate || filterUf !== 'all') && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setSearchTerm('');
                        setFilterDate('');
                        setFilterUf('all');
                      }}
                      className="h-8 text-[11px] font-bold text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      LIMPAR FILTROS
                    </Button>
                  )}
                  <div className="flex items-center gap-2">
                    <Label className="text-[11px] font-bold uppercase text-muted-foreground whitespace-nowrap">Data:</Label>
                    <Input 
                      type="date"
                      className="h-8 w-32 text-[12px] bg-white px-2"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                    />
                    {filterDate && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-muted-foreground"
                        onClick={() => setFilterDate('')}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Label className="text-[11px] font-bold uppercase text-muted-foreground">UF:</Label>
                    <Select value={filterUf} onValueChange={setFilterUf}>
                      <SelectTrigger className="h-8 w-24 text-[12px] bg-white">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {UFS.map(uf => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                <div className="space-y-6 p-4">
                  {/* Rota Nova Section */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 border-b border-border pb-1">
                      <Badge className="bg-blue-600 text-white hover:bg-blue-600">ROTAS NOVAS</Badge>
                      <span className="text-[11px] text-muted-foreground font-bold">{routesNova.length} registros</span>
                    </div>
                    <RouteTable 
                      routes={routesNova} 
                      user={user} 
                      onEdit={handleEdit} 
                      onDelete={handleDelete} 
                      onRelease={handleReleaseRoute}
                    />
                  </div>

                  {/* Rota Antiga Section */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 border-b border-border pb-1">
                      <Badge className="bg-orange-600 text-white hover:bg-orange-600">ROTAS ANTIGAS</Badge>
                      <span className="text-[11px] text-muted-foreground font-bold">{routesAntiga.length} registros</span>
                    </div>
                    <RouteTable 
                      routes={routesAntiga} 
                      user={user} 
                      onEdit={handleEdit} 
                      onDelete={handleDelete} 
                      onRelease={handleReleaseRoute}
                    />
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : (
          <LoadingPanel cards={loadingCards} stats={loadingStats} />
        )}
      </main>

      {/* Edit Dialog (Keep for functionality) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[400px] hidden">
          {/* Hidden because we use the sidebar for editing too, but keeping state logic consistent */}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface RouteTableProps {
  routes: Route[];
  user: User;
  onEdit: (route: Route) => void;
  onDelete: (id: string, createdBy: string) => void;
  onRelease: (route: Route) => void;
}

function RouteTable({ routes, user, onEdit, onDelete, onRelease }: RouteTableProps) {
  const getCargoBadgeColor = (type: string) => {
    switch (type) {
      case 'plastico': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'porcelana': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'consolidado': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <Table className="text-[12px]">
      <TableHeader className="bg-slate-50">
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[80px] font-bold py-2 px-3">Rota</TableHead>
          <TableHead className="w-[100px] font-bold py-2 px-3">Carga</TableHead>
          <TableHead className="font-bold py-2 px-3">Entregas / Clientes</TableHead>
          <TableHead className="w-[100px] font-bold py-2 px-3">Data</TableHead>
          <TableHead className="w-[120px] text-right font-bold py-2 px-3">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {routes.length > 0 ? (
          routes.map((route) => (
            <TableRow 
              key={route.id} 
              className="hover:bg-slate-50/80 group border-b border-border cursor-pointer transition-colors"
              onClick={() => onEdit(route)}
            >
              <TableCell className="font-bold py-2 px-3 text-primary">#{route.routeNumber}</TableCell>
              <TableCell className="py-2 px-3">
                <Badge variant="outline" className={`text-[10px] font-bold uppercase px-1.5 py-0 ${getCargoBadgeColor(route.cargoType)}`}>
                  {route.cargoType}
                </Badge>
              </TableCell>
              <TableCell className="py-2 px-3">
                <div className="flex flex-wrap gap-1">
                  {route.deliveries.map((d, i) => (
                    <div key={i} className="flex items-center gap-1 bg-white px-2 py-0.5 rounded text-[11px] border border-slate-200 shadow-sm">
                      <div className={`w-1.5 h-1.5 rounded-full ${d.status === 'carregado' ? 'bg-green-500' : 'bg-slate-300'}`} />
                      <span className="font-bold text-primary">{d.uf}</span>
                      <span className="text-muted-foreground">|</span>
                      <span className="truncate max-w-[150px]" title={`${d.clientName} - ${d.location}`}>
                        {d.clientName}
                      </span>
                    </div>
                  ))}
                </div>
              </TableCell>
              <TableCell className="py-2 px-3 font-medium">
                {format(new Date(route.deliveryDate), 'dd/MM/yyyy')}
              </TableCell>
              <TableCell className="text-right py-2 px-3" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {route.createdBy === user.uid && (
                    <>
                      {!route.releasedToLoading && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => onRelease(route)}
                          title="Liberar para Carregamento"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                        onClick={() => onEdit(route)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => onDelete(route.id, route.createdBy)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={5} className="h-20 text-center text-muted-foreground italic">
              Nenhum registro nesta categoria.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

function LoadingPanel({ cards, stats }: { cards: LoadingCard[], stats: any }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pendente': return 'bg-slate-500';
      case 'Separando': return 'bg-orange-500 animate-pulse';
      case 'Separado': return 'bg-purple-600';
      case 'Carregando': return 'bg-red-500 animate-pulse';
      case 'Embarcado': return 'bg-green-600';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-5 overflow-hidden">
      {/* Loading Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="p-3 text-center border-b-4 border-slate-600">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Total</p>
          <p className="text-xl font-bold">{cards.length}</p>
        </Card>
        <Card className="p-3 text-center border-b-4 border-red-600 bg-red-50">
          <p className="text-[10px] font-bold text-red-600 uppercase">Acumuladas</p>
          <p className="text-xl font-bold text-red-600">{cards.filter(c => c.isAcumulado).length}</p>
        </Card>
        <Card className="p-3 text-center border-b-4 border-slate-400">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Pendente</p>
          <p className="text-xl font-bold">{cards.filter(c => c.status === 'Pendente').length}</p>
        </Card>
        <Card className="p-3 text-center border-b-4 border-orange-500">
          <p className="text-[10px] font-bold text-orange-600 uppercase">Separando</p>
          <p className="text-xl font-bold">{cards.filter(c => c.status === 'Separando').length}</p>
        </Card>
        <Card className="p-3 text-center border-b-4 border-purple-600">
          <p className="text-[10px] font-bold text-purple-600 uppercase">Separados</p>
          <p className="text-xl font-bold">{cards.filter(c => c.status === 'Separado').length}</p>
        </Card>
        <Card className="p-3 text-center border-b-4 border-red-500">
          <p className="text-[10px] font-bold text-red-600 uppercase">Carregando</p>
          <p className="text-xl font-bold">{cards.filter(c => c.status === 'Carregando').length}</p>
        </Card>
        <Card className="p-3 text-center border-b-4 border-green-600">
          <p className="text-[10px] font-bold text-green-600 uppercase">Embarcados</p>
          <p className="text-xl font-bold">{cards.filter(c => c.status === 'Embarcado').length}</p>
        </Card>
      </section>

      {/* Cards Grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
          {cards.length > 0 ? (
            cards.map((card) => (
              <Card key={card.id} className="overflow-hidden border-l-4 border-slate-200 shadow-sm flex flex-col" style={{ borderLeftColor: getStatusColor(card.status).split(' ')[0] }}>
                <CardHeader className="p-4 pb-2 relative">
                  <div className="absolute top-4 right-4">
                    <Badge className={`${getStatusColor(card.status)} text-white border-none text-[10px] font-bold`}>
                      {card.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-[15px] font-bold pr-20 leading-tight">
                    Rota: {card.rota} ({card.nRota})
                    {card.nRotaLog && <span className="text-muted-foreground ml-1"> - {card.nRotaLog}</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 flex-1 flex flex-col gap-3">
                  {card.isAcumulado && (
                    <div className="bg-red-50 border border-red-100 text-red-600 p-2 rounded text-[10px] font-bold flex items-center gap-2">
                      <AlertCircle className="w-3 h-3" />
                      CARD DO DIA ANTERIOR QUE NÃO FOI CARREGADO
                    </div>
                  )}

                  <div className="bg-red-50 border-2 border-red-600 p-2 rounded text-center">
                    <p className="text-[18px] font-black text-red-600 uppercase tracking-widest">DOCA {card.doca || '-'}</p>
                  </div>
                  
                  <div className="border-b border-slate-100 pb-2">
                    <p className="text-[11px] font-bold text-slate-600 uppercase">PLANTA: {card.planta || '-'}</p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg space-y-1 text-[12px]">
                    <p><span className="text-muted-foreground font-medium">Motorista:</span> <span className="font-bold">{card.motorista || 'N/I'}</span></p>
                    <p><span className="text-muted-foreground font-medium">Valor:</span> <span className="font-bold text-green-600">{card.valor || 'R$ 0,00'}</span></p>
                    <p><span className="text-muted-foreground font-medium">Veículo:</span> <span className="font-bold">{card.veiculo || 'N/I'}</span> <span className="text-muted-foreground mx-1">|</span> <span className="text-muted-foreground font-medium">Conf:</span> <span className="font-bold">{card.conferente || 'N/I'}</span></p>
                    <p><span className="text-muted-foreground font-medium">Qtd:</span> <span className="font-bold">{card.qtd} pedidos</span></p>
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Clock className="w-3 h-3" />
                        <span>Separação:</span>
                        <span className="font-bold">{card.iniSep || '--:--'} às {card.fimSep || '--:--'}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Truck className="w-3 h-3" />
                        <span>Carregamento:</span>
                        <span className="font-bold">{card.iniCar || '--:--'} às {card.fimCar || '--:--'}</span>
                      </div>
                    </div>
                  </div>

                  {card.status === 'Embarcado' && (
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-center gap-2 text-green-600 font-bold text-[13px]">
                      <CheckCircle2 className="w-4 h-4" />
                      EMBARQUE CONCLUÍDO
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full h-40 flex flex-center justify-center items-center text-muted-foreground italic">
              Nenhum card de carregamento encontrado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
