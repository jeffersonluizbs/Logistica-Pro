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
  ChevronUp
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
import { Route, RouteFormData, DeliveryDetail } from '@/types';
import { auth } from '@/firebase';

const INITIAL_DELIVERY: DeliveryDetail = {
  location: '',
  uf: '',
  region: '',
  clientName: '',
  orderNumber: '',
  invoiceNumber: '',
};

const INITIAL_FORM_DATA: RouteFormData = {
  routeNumber: '',
  type: 'nova',
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

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

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
  const routesFinalMes = filteredRoutes.filter(r => r.type === 'final_mes');

  const stats = {
    today: routes.filter(r => r.deliveryDate === new Date().toISOString().split('T')[0]).length,
    total: routes.length,
    pending: routes.filter(r => new Date(r.deliveryDate) > new Date()).length,
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
              <Select value={formData.type} onValueChange={handleTypeChange}>
                <SelectTrigger className="h-9 text-[13px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nova">Rota Nova</SelectItem>
                  <SelectItem value="final_mes">Final do Mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

        {/* Stats Bar */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-3 bg-white border-border shadow-none">
            <p className="text-[11px] font-bold uppercase text-muted-foreground">Rotas Hoje</p>
            <p className="text-[18px] font-bold">{stats.today}</p>
          </Card>
          <Card className="p-3 bg-white border-border shadow-none">
            <p className="text-[11px] font-bold uppercase text-muted-foreground">Total Geral</p>
            <p className="text-[18px] font-bold">{stats.total}</p>
          </Card>
          <Card className="p-3 bg-white border-border shadow-none">
            <p className="text-[11px] font-bold uppercase text-muted-foreground">Status Frota</p>
            <p className="text-[18px] font-bold text-green-600">92%</p>
          </Card>
          <Card className="p-3 bg-white border-border shadow-none">
            <p className="text-[11px] font-bold uppercase text-muted-foreground">Pendentes</p>
            <p className="text-[18px] font-bold">{stats.pending.toString().padStart(2, '0')}</p>
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
                  <Badge className="bg-blue-600 text-white hover:bg-blue-600">ROTA NOVA</Badge>
                  <span className="text-[11px] text-muted-foreground font-bold">{routesNova.length} registros</span>
                </div>
                <RouteTable 
                  routes={routesNova} 
                  user={user} 
                  onEdit={handleEdit} 
                  onDelete={handleDelete} 
                />
              </div>

              {/* Rota Final do Mês Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 border-b border-border pb-1">
                  <Badge className="bg-orange-600 text-white hover:bg-orange-600">FINAL DO MÊS</Badge>
                  <span className="text-[11px] text-muted-foreground font-bold">{routesFinalMes.length} registros</span>
                </div>
                <RouteTable 
                  routes={routesFinalMes} 
                  user={user} 
                  onEdit={handleEdit} 
                  onDelete={handleDelete} 
                />
              </div>
            </div>
          </div>
        </section>
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
}

function RouteTable({ routes, user, onEdit, onDelete }: RouteTableProps) {
  return (
    <Table className="text-[12px]">
      <TableHeader className="bg-slate-50">
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[80px] font-bold py-2 px-3">Rota</TableHead>
          <TableHead className="font-bold py-2 px-3">Entregas / Clientes</TableHead>
          <TableHead className="w-[100px] font-bold py-2 px-3">Data</TableHead>
          <TableHead className="w-[80px] text-right font-bold py-2 px-3">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {routes.length > 0 ? (
          routes.map((route) => (
            <TableRow key={route.id} className="hover:bg-slate-50/50 group border-b border-border">
              <TableCell className="font-bold py-2 px-3">#{route.routeNumber}</TableCell>
              <TableCell className="py-2 px-3">
                <div className="flex flex-wrap gap-1">
                  {route.deliveries.map((d, i) => (
                    <div key={i} className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                      <span className="font-bold text-primary">{d.uf}</span>
                      <span className="text-muted-foreground">|</span>
                      <span className="truncate max-w-[150px]" title={`${d.clientName} - ${d.location}`}>
                        {d.clientName} ({d.location})
                      </span>
                      <span className="text-[10px] bg-white px-1 rounded border border-slate-200">NF: {d.invoiceNumber}</span>
                    </div>
                  ))}
                </div>
              </TableCell>
              <TableCell className="py-2 px-3">
                {format(new Date(route.deliveryDate), 'dd/MM/yyyy')}
              </TableCell>
              <TableCell className="text-right py-2 px-3">
                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {route.createdBy === user.uid && (
                    <>
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
            <TableCell colSpan={4} className="h-20 text-center text-muted-foreground italic">
              Nenhum registro nesta categoria.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
