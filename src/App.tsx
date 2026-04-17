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
import { nfService } from '@/services/nfService';
import { Route, RouteFormData, DeliveryDetail } from '@/types';
import { auth } from '@/firebase';

const INITIAL_DELIVERY: DeliveryDetail = {
  location: '',
  uf: '',
  region: '',
  clientName: '',
  orderNumber: '',
  invoiceNumber: '',
  deliveryDate: new Date().toISOString().split('T')[0],
  status: 'pendente',
};

const INITIAL_FORM_DATA: RouteFormData = {
  routeNumber: '',
  type: 'nova',
  cargoType: 'consolidado',
  vehicleType: '',
  deliveries: [{ ...INITIAL_DELIVERY }],
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
  const [filterMonth, setFilterMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'logistica' | 'carregamento'>('logistica');
  const [loadingCards, setLoadingCards] = useState<LoadingCard[]>([]);
  const [loadingStats, setLoadingStats] = useState<any>(null);
  const [routeToRelease, setRouteToRelease] = useState<Route | null>(null);
  const [releaseDate, setReleaseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loadingFilterDate, setLoadingFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (user) {
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
  }, [user]);

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
      vehicleType: route.vehicleType || '',
      deliveries: route.deliveries,
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

  const handleOpenReleaseDialog = (route: Route) => {
    setRouteToRelease(route);
    setReleaseDate(new Date().toISOString().split('T')[0]);
  };

  const confirmReleaseRoute = async () => {
    if (!routeToRelease) return;
    
    try {
      const success = await loadingService.releaseRoute(routeToRelease, releaseDate);
      if (success) {
        await routeService.releaseRoute(routeToRelease.id);
        alert("Rota liberada com sucesso!");
      } else {
        alert("Erro ao liberar rota. Verifique a configuração do Apps Script.");
      }
    } catch (error) {
      console.error("Erro ao liberar rota:", error);
    } finally {
      setRouteToRelease(null);
    }
  };

  const filteredRoutes = routes.filter(route => {
    // Current month filter 
    const routeMonth = new Date(route.createdAt).toISOString().slice(0, 7);
    if (routeMonth !== filterMonth) return false;

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
    const matchesDate = !filterDate || route.deliveries.some(d => d.deliveryDate === filterDate);
    
    return matchesSearch && matchesUf && matchesDate;
  });

  const routesNova = filteredRoutes.filter(r => r.type === 'nova');
  const routesAntiga = filteredRoutes.filter(r => r.type !== 'nova');

  const getRouteLoadingStatus = (route: Route): string | null => {
    if (!route.releasedToLoading) return null;
    if (route.statusOverride === 'pendente') return null;
    
    const matchingCards = loadingCards.filter(c => c.nRotaLog === route.routeNumber);
    if (matchingCards.length === 0) return null;
    
    return matchingCards[matchingCards.length - 1].status;
  };

  const isRouteLoaded = (route: Route) => getRouteLoadingStatus(route) === 'Embarcado';

  const handleRevertEmbarcado = async (route: Route) => {
    if (window.confirm("Deseja forçar o status desta rota para PENDENTE?\n(Isso ignorará o último 'Embarcado' e permitirá liberar a rota novamente se necessário)")) {
      try {
        await routeService.revertStatus(route.id, 'pendente');
      } catch (error) {
        console.error("Erro ao reverter status:", error);
      }
    }
  };

  const getCargoStats = (routeList: Route[]) => {
    const plastico = routeList.filter(r => r.cargoType === 'plastico');
    const porcelana = routeList.filter(r => r.cargoType === 'porcelana');
    const consolidado = routeList.filter(r => r.cargoType === 'consolidado');

    return {
      plastico: {
        total: plastico.length,
        carregada: plastico.filter(isRouteLoaded).length,
        pendente: plastico.filter(r => !isRouteLoaded(r)).length,
      },
      porcelana: {
        total: porcelana.length,
        carregada: porcelana.filter(isRouteLoaded).length,
        pendente: porcelana.filter(r => !isRouteLoaded(r)).length,
      },
      consolidado: {
        total: consolidado.length,
        carregada: consolidado.filter(isRouteLoaded).length,
        pendente: consolidado.filter(r => !isRouteLoaded(r)).length,
      },
    };
  };

  const calculateLoadingPercentage = (routeList: Route[]) => {
    if (routeList.length === 0) return 0;
    const loadedRoutes = routeList.filter(isRouteLoaded).length;
    return Math.round((loadedRoutes / routeList.length) * 100) || 0;
  };

  const stats = {
    total: routes.length,
    nova: {
      count: routes.filter(r => r.type === 'nova').length,
      pendente: routes.filter(r => r.type === 'nova' && !isRouteLoaded(r)).length,
      carregada: routes.filter(r => r.type === 'nova' && isRouteLoaded(r)).length,
      cargo: getCargoStats(routes.filter(r => r.type === 'nova')),
      loading: calculateLoadingPercentage(routes.filter(r => r.type === 'nova')),
    },
    antiga: {
      count: routes.filter(r => r.type !== 'nova').length,
      pendente: routes.filter(r => r.type !== 'nova' && !isRouteLoaded(r)).length,
      carregada: routes.filter(r => r.type !== 'nova' && isRouteLoaded(r)).length,
      cargo: getCargoStats(routes.filter(r => r.type !== 'nova')),
      loading: calculateLoadingPercentage(routes.filter(r => r.type !== 'nova')),
    },
    vehicle: {
      carreta: routes.filter(r => r.vehicleType === 'Carreta').length,
      truck: routes.filter(r => r.vehicleType === 'Truck').length,
      tresquartos: routes.filter(r => r.vehicleType === '3/4').length,
      container: routes.filter(r => r.vehicleType === 'Container').length,
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
              <Label className="text-[11px] font-bold uppercase text-muted-foreground">Veículo</Label>
              <Select value={formData.vehicleType || ''} onValueChange={(value: any) => setFormData(prev => ({ ...prev, vehicleType: value }))}>
                <SelectTrigger className="h-9 text-[13px]">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Carreta">Carreta</SelectItem>
                  <SelectItem value="Truck">Truck</SelectItem>
                  <SelectItem value="3/4">3/4</SelectItem>
                  <SelectItem value="Container">Container</SelectItem>
                </SelectContent>
              </Select>
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

                <div className="grid grid-cols-2 gap-2">
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
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Data de Entrega</Label>
                    <Input 
                      type="date"
                      value={delivery.deliveryDate} 
                      onChange={(e) => handleDeliveryChange(index, 'deliveryDate', e.target.value)} 
                      className="h-8 text-[12px]"
                      required 
                    />
                  </div>
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

          <Button 
            type="button" 
            variant="secondary"
            onClick={async () => {
              const url = "https://script.google.com/macros/s/AKfycbx-Lmqxk-Wbss3icKxOZ0KYzrOWCOn9oOflvQ7ax29jiGYe2Ih3t3z52-nw0hR0kTJHpg/exec";

              // Extract relevant orders
              const extractOrders = (text: string) => text.match(/\b\d+-\d+\b/g) || [];
              const ordersToFetch = new Set<string>();

              formData.deliveries.forEach(d => {
                if (d.orderNumber && !d.invoiceNumber) {
                  extractOrders(d.orderNumber).forEach(o => ordersToFetch.add(o));
                }
              });

              if (ordersToFetch.size === 0) {
                alert("Nenhum pedido pendente de NF encontrado nesta rota para sincronizar.");
                return;
              }

              const allOrders = Array.from(ordersToFetch);
              const mapping = await nfService.fetchNFs(allOrders, url);
              
              const normalize = (o: string) => {
                const [ped, dig] = o.split('-');
                if (!dig) return o;
                return `${ped}-${parseInt(dig, 10)}`;
              }

              const newDeliveries = formData.deliveries.map(d => {
                if (!d.orderNumber) return d;
                const orders = extractOrders(d.orderNumber);
                const nfs = orders.map(o => mapping[o] || mapping[normalize(o)]).filter(Boolean);
                if (nfs.length > 0) {
                   return { ...d, invoiceNumber: nfs.join(' / ') };
                }
                return d;
              });

              setFormData(prev => ({ ...prev, deliveries: newDeliveries }));
              alert("Sincronização concluída! Revise as notas fiscais preenchidas no formulário.");
            }} 
            className="w-full h-9 text-[12px] bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold border border-blue-200"
          >
            Sincronizar NFs do formulário
          </Button>

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

        {/* Header Area with Tabs and Month Selector */}
        <div className="flex items-center justify-between mb-2">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit">
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

          {/* Month Selector */}
          <div className="flex items-center gap-2">
            <Label className="text-[11px] font-bold uppercase text-muted-foreground">Mês:</Label>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="h-8 w-32 text-[12px] bg-white font-bold text-slate-700">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {Array.from(new Set([
                  new Date().toISOString().slice(0, 7),
                  ...routes.map(r => new Date(r.createdAt).toISOString().slice(0, 7))
                ])).sort().reverse().map(monthStr => {
                  const [y, m] = monthStr.split('-');
                  const monthName = new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleString('pt-BR', { month: 'long' });
                  return (
                    <SelectItem key={monthStr} value={monthStr} className="capitalize">
                      {monthName} / {y}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {activeTab === 'logistica' ? (
          <>
            {/* Stats Bar */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4 bg-white border-border shadow-sm flex flex-col justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase text-muted-foreground mb-1">Total Geral</p>
                  <p className="text-[24px] font-bold text-slate-900">{stats.total}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-4 gap-1 text-[9px] text-center">
                  <div className="flex flex-col bg-slate-50 p-1 rounded"><span className="text-muted-foreground">Carreta</span><span className="font-bold text-slate-700">{stats.vehicle.carreta}</span></div>
                  <div className="flex flex-col bg-slate-50 p-1 rounded"><span className="text-muted-foreground">Truck</span><span className="font-bold text-slate-700">{stats.vehicle.truck}</span></div>
                  <div className="flex flex-col bg-slate-50 p-1 rounded"><span className="text-muted-foreground">3/4</span><span className="font-bold text-slate-700">{stats.vehicle.tresquartos}</span></div>
                  <div className="flex flex-col bg-slate-50 p-1 rounded"><span className="text-muted-foreground">Container</span><span className="font-bold text-slate-700">{stats.vehicle.container}</span></div>
                </div>
              </Card>

              <Card className="p-4 bg-white border-border shadow-sm flex flex-col justify-between">
                <div className="flex gap-4 h-full">
                  <div 
                    className="flex-1 flex flex-col justify-between cursor-pointer hover:bg-slate-50 transition-colors p-2 -m-2 rounded"
                    onClick={() => {
                      setLoadingFilterDate(new Date().toISOString().split('T')[0]);
                      setActiveTab('carregamento');
                    }}
                  >
                    <div>
                      <p className="text-[10px] font-bold uppercase text-green-600 mb-1 leading-tight">Liberadas<br/>Hoje</p>
                      <p className="text-[20px] font-bold text-slate-900">
                        {loadingCards.filter(c => {
                          const todayISO = new Date().toISOString().split('T')[0];
                          const [year, month, day] = todayISO.split('-');
                          const todayBR = `${day}/${month}/${year}`;
                          return c.dataSep === todayISO || c.dataSep === todayBR;
                        }).length}
                      </p>
                    </div>
                  </div>
                  <div className="w-px bg-slate-100 my-2"></div>
                  <div 
                    className="flex-1 flex flex-col justify-between cursor-pointer hover:bg-slate-50 transition-colors p-2 -m-2 rounded"
                    onClick={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      setLoadingFilterDate(tomorrow.toISOString().split('T')[0]);
                      setActiveTab('carregamento');
                    }}
                  >
                    <div>
                      <p className="text-[10px] font-bold uppercase text-blue-600 mb-1 leading-tight">Para<br/>Amanhã</p>
                      <p className="text-[20px] font-bold text-slate-900">
                        {loadingCards.filter(c => {
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          const tomorrowISO = tomorrow.toISOString().split('T')[0];
                          const [year, month, day] = tomorrowISO.split('-');
                          const tomorrowBR = `${day}/${month}/${year}`;
                          return c.dataSep === tomorrowISO || c.dataSep === tomorrowBR;
                        }).length}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-white border-border shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase text-blue-600">Carregamento (Novas)</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-[20px] font-bold text-slate-900">{stats.nova.loading}%</p>
                      <span className="text-[10px] font-bold text-muted-foreground">({stats.nova.carregada}/{stats.nova.count})</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[9px] font-bold uppercase text-center mt-2">
                  <div className="flex flex-col bg-slate-50 rounded p-1">
                    <span className="text-muted-foreground mb-0.5">Plást. ({stats.nova.cargo.plastico.total})</span>
                    <span className="text-slate-500">{stats.nova.cargo.plastico.pendente}P / <span className="text-green-600">{stats.nova.cargo.plastico.carregada}C</span></span>
                  </div>
                  <div className="flex flex-col bg-slate-50 rounded p-1">
                    <span className="text-muted-foreground mb-0.5">Porc. ({stats.nova.cargo.porcelana.total})</span>
                    <span className="text-slate-500">{stats.nova.cargo.porcelana.pendente}P / <span className="text-green-600">{stats.nova.cargo.porcelana.carregada}C</span></span>
                  </div>
                  <div className="flex flex-col bg-slate-50 rounded p-1">
                    <span className="text-muted-foreground mb-0.5">Cons. ({stats.nova.cargo.consolidado.total})</span>
                    <span className="text-slate-500">{stats.nova.cargo.consolidado.pendente}P / <span className="text-green-600">{stats.nova.cargo.consolidado.carregada}C</span></span>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-white border-border shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase text-orange-600">Carregamento (Antigas)</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-[20px] font-bold text-slate-900">{stats.antiga.loading}%</p>
                      <span className="text-[10px] font-bold text-muted-foreground">({stats.antiga.carregada}/{stats.antiga.count})</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[9px] font-bold uppercase text-center mt-2">
                  <div className="flex flex-col bg-slate-50 rounded p-1">
                    <span className="text-muted-foreground mb-0.5">Plást. ({stats.antiga.cargo.plastico.total})</span>
                    <span className="text-slate-500">{stats.antiga.cargo.plastico.pendente}P / <span className="text-green-600">{stats.antiga.cargo.plastico.carregada}C</span></span>
                  </div>
                  <div className="flex flex-col bg-slate-50 rounded p-1">
                    <span className="text-muted-foreground mb-0.5">Porc. ({stats.antiga.cargo.porcelana.total})</span>
                    <span className="text-slate-500">{stats.antiga.cargo.porcelana.pendente}P / <span className="text-green-600">{stats.antiga.cargo.porcelana.carregada}C</span></span>
                  </div>
                  <div className="flex flex-col bg-slate-50 rounded p-1">
                    <span className="text-muted-foreground mb-0.5">Cons. ({stats.antiga.cargo.consolidado.total})</span>
                    <span className="text-slate-500">{stats.antiga.cargo.consolidado.pendente}P / <span className="text-green-600">{stats.antiga.cargo.consolidado.carregada}C</span></span>
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
                      searchTerm={searchTerm}
                      getRouteLoadingStatus={getRouteLoadingStatus}
                      onEdit={handleEdit} 
                      onDelete={handleDelete} 
                      onRelease={handleOpenReleaseDialog}
                      onRevertEmbarcado={handleRevertEmbarcado}
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
                      searchTerm={searchTerm}
                      getRouteLoadingStatus={getRouteLoadingStatus}
                      onEdit={handleEdit} 
                      onDelete={handleDelete} 
                      onRelease={handleOpenReleaseDialog}
                      onRevertEmbarcado={handleRevertEmbarcado}
                    />
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : (
          <LoadingPanel 
            cards={loadingCards} 
            stats={loadingStats} 
            localRoutes={routes} 
            filterDate={loadingFilterDate}
            setFilterDate={setLoadingFilterDate}
          />
        )}
      </main>

      {/* Release Dialog */}
      <Dialog open={!!routeToRelease} onOpenChange={(open) => !open && setRouteToRelease(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Liberar Rota para Carregamento</DialogTitle>
            <DialogDescription>
              Deseja liberar a rota #{routeToRelease?.routeNumber} para que dia?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex flex-col gap-2">
              <Label className="text-[12px] font-bold uppercase text-muted-foreground">Data de Separação/Carregamento</Label>
              <Input 
                type="date" 
                value={releaseDate} 
                onChange={(e) => setReleaseDate(e.target.value)} 
                className="h-10"
                required 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRouteToRelease(null)}>Cancelar</Button>
            <Button onClick={confirmReleaseRoute} className="bg-blue-600 hover:bg-blue-700 text-white">
              Liberar Rota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
  user: any;
  searchTerm?: string;
  getRouteLoadingStatus: (route: Route) => string | null;
  onEdit: (route: Route) => void;
  onDelete: (id: string, createdBy: string) => void;
  onRelease: (route: Route) => void;
  onRevertEmbarcado: (route: Route) => void;
}

function RouteTable({ routes, user, searchTerm = '', getRouteLoadingStatus, onEdit, onDelete, onRelease, onRevertEmbarcado }: RouteTableProps) {
  const getCargoBadgeColor = (type: string) => {
    switch (type) {
      case 'plastico': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'porcelana': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'consolidado': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const highlightText = (text: string) => {
    if (!searchTerm || !text) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i} className="bg-yellow-200 text-amber-900 rounded px-0.5">{part}</mark> : part
    );
  };

  return (
    <Table className="text-[12px]">
      <TableHeader className="bg-slate-50">
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[80px] font-bold py-2 px-3">Rota</TableHead>
          <TableHead className="w-[100px] font-bold py-2 px-3">Carga</TableHead>
          <TableHead className="font-bold py-2 px-3">Entregas / Clientes</TableHead>
          <TableHead className="w-[120px] text-right font-bold py-2 px-3">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {routes.length > 0 ? (
          routes.map((route) => {
            const loadingStatus = getRouteLoadingStatus(route);
            return (
              <TableRow 
                key={route.id} 
                className="hover:bg-slate-50/80 group border-b border-border cursor-pointer transition-colors"
                onClick={() => onEdit(route)}
              >
                <TableCell className="font-bold py-2 px-3 text-primary">
                  <div className="flex flex-col gap-1 items-start">
                    <span>#{route.routeNumber}</span>
                    {loadingStatus && (
                      <Badge 
                        className={`text-white text-[9px] px-1 py-0 w-fit cursor-pointer transition-colors ${
                          loadingStatus === 'Embarcado' ? 'bg-green-600 hover:bg-green-700' :
                          loadingStatus === 'Carregando' ? 'bg-red-500 hover:bg-red-600' :
                          loadingStatus === 'Separando' ? 'bg-orange-500 hover:bg-orange-600' :
                          loadingStatus === 'Separado' ? 'bg-purple-600 hover:bg-purple-700' :
                          'bg-slate-500 hover:bg-slate-600'
                        }`}
                        title={loadingStatus === 'Embarcado' ? "Clique para retornar a status PENDENTE" : ""}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (loadingStatus === 'Embarcado') {
                            onRevertEmbarcado(route);
                          }
                        }}
                      >
                        {loadingStatus.toUpperCase()}
                      </Badge>
                    )}
                </div>
              </TableCell>
              <TableCell className="py-2 px-3">
                <Badge variant="outline" className={`text-[10px] font-bold uppercase px-1.5 py-0 ${getCargoBadgeColor(route.cargoType)}`}>
                  {route.cargoType}
                </Badge>
              </TableCell>
              <TableCell className="py-2 px-3">
                <div className="flex flex-col gap-1">
                  {route.deliveries.map((d, i) => (
                    <div key={i} className="flex flex-col bg-white px-2 py-1 rounded text-[11px] border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${d.status === 'carregado' ? 'bg-green-500' : 'bg-slate-300'}`} />
                        <span className="font-bold text-slate-700">{d.location}</span>
                        <span className="text-muted-foreground">-</span>
                        <span className="font-bold text-primary">{d.uf}</span>
                        <span className="text-muted-foreground">({d.region})</span>
                        <span className="text-muted-foreground">|</span>
                        <span className="truncate max-w-[150px] font-medium" title={d.clientName}>
                          {d.clientName}
                        </span>
                        {d.deliveryDate && (
                          <>
                            <span className="text-muted-foreground">|</span>
                            <span className="text-blue-600 font-bold">
                              {d.deliveryDate.split('-').reverse().join('/')}
                            </span>
                          </>
                        )}
                      </div>
                      {(d.orderNumber || d.invoiceNumber) && (
                        <div className="flex items-center gap-2 pl-2.5 mt-0.5 text-[10px] text-slate-500">
                          {d.orderNumber && <span><span className="font-medium">Ped:</span> {highlightText(d.orderNumber)}</span>}
                          {d.orderNumber && d.invoiceNumber && <span className="text-slate-300">•</span>}
                          {d.invoiceNumber && <span><span className="font-medium">NF:</span> {highlightText(d.invoiceNumber)}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-right py-2 px-3" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {route.createdBy === user.uid && (
                    <>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={`h-7 w-7 ${loadingStatus ? 'text-green-600 hover:text-green-700 hover:bg-green-50' : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'}`}
                        onClick={() => onRelease(route)}
                        title={loadingStatus ? "Liberar Novamente" : "Liberar para Carregamento"}
                      >
                        <Send className="w-3.5 h-3.5" />
                      </Button>
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
            );
          })
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

function LoadingPanel({ cards, stats, localRoutes, filterDate, setFilterDate }: { cards: LoadingCard[], stats: any, localRoutes: Route[], filterDate: string, setFilterDate: (date: string) => void }) {
  const filteredCards = cards.filter(card => {
    if (!filterDate) return true;
    
    // card.dataSep usually comes as YYYY-MM-DD or DD/MM/YYYY depending on GAS
    // Let's handle both just in case, but usually input type="date" gives YYYY-MM-DD
    if (card.dataSep === filterDate) return true;
    
    // If GAS sends DD/MM/YYYY, convert filterDate (YYYY-MM-DD) to DD/MM/YYYY to compare
    const [year, month, day] = filterDate.split('-');
    const formattedFilter = `${day}/${month}/${year}`;
    if (card.dataSep === formattedFilter) return true;

    return false;
  });

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
      {/* Filters */}
      <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-border shadow-sm">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-[13px] font-bold text-slate-700">FILTRAR POR DATA:</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="date"
              className="h-9 w-[140px] px-3 py-1 text-[13px] border border-input rounded-md bg-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
            {filterDate && (
              <button 
                onClick={() => setFilterDate('')}
                className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="p-3 text-center border-b-4 border-slate-600">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Total</p>
          <p className="text-xl font-bold">{filteredCards.length}</p>
        </Card>
        <Card className="p-3 text-center border-b-4 border-red-600 bg-red-50">
          <p className="text-[10px] font-bold text-red-600 uppercase">Acumuladas</p>
          <p className="text-xl font-bold text-red-600">{filteredCards.filter(c => c.isAcumulado).length}</p>
        </Card>
        <Card className="p-3 text-center border-b-4 border-slate-400">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Pendente</p>
          <p className="text-xl font-bold">{filteredCards.filter(c => c.status === 'Pendente').length}</p>
        </Card>
        <Card className="p-3 text-center border-b-4 border-orange-500">
          <p className="text-[10px] font-bold text-orange-600 uppercase">Separando</p>
          <p className="text-xl font-bold">{filteredCards.filter(c => c.status === 'Separando').length}</p>
        </Card>
        <Card className="p-3 text-center border-b-4 border-purple-600">
          <p className="text-[10px] font-bold text-purple-600 uppercase">Separados</p>
          <p className="text-xl font-bold">{filteredCards.filter(c => c.status === 'Separado').length}</p>
        </Card>
        <Card className="p-3 text-center border-b-4 border-red-500">
          <p className="text-[10px] font-bold text-red-600 uppercase">Carregando</p>
          <p className="text-xl font-bold">{filteredCards.filter(c => c.status === 'Carregando').length}</p>
        </Card>
        <Card className="p-3 text-center border-b-4 border-green-600">
          <p className="text-[10px] font-bold text-green-600 uppercase">Embarcados</p>
          <p className="text-xl font-bold">{filteredCards.filter(c => c.status === 'Embarcado').length}</p>
        </Card>
      </section>

      {/* Cards Grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
          {filteredCards.length > 0 ? (
            filteredCards.map((card) => {
              const localRoute = localRoutes.find(r => r.routeNumber === card.nRotaLog);
              
              return (
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

                  {localRoute && localRoute.deliveries.some(d => d.orderNumber || d.invoiceNumber) && (
                    <div className="mt-2 pt-3 border-t border-slate-200">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Pedidos e Notas (Local)</p>
                      <div className="space-y-1.5">
                        {localRoute.deliveries.filter(d => d.orderNumber || d.invoiceNumber).map((d, i) => (
                          <div key={i} className="bg-slate-50 p-2 rounded border border-slate-100 text-[11px]">
                            <p className="font-bold text-slate-700 mb-0.5 truncate" title={d.clientName}>{d.clientName}</p>
                            <div className="flex items-center gap-2 text-slate-600">
                              {d.orderNumber && <span><span className="font-medium">Ped:</span> {d.orderNumber}</span>}
                              {d.orderNumber && d.invoiceNumber && <span className="text-slate-300">•</span>}
                              {d.invoiceNumber && <span><span className="font-medium">NF:</span> {d.invoiceNumber}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )})
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
