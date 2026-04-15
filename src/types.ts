export interface DeliveryDetail {
  location: string;
  uf: string;
  region: string;
  clientName: string;
  orderNumber: string;
  invoiceNumber: string;
  status?: 'pendente' | 'carregado';
}

export interface Route {
  id: string;
  routeNumber: string;
  type: 'nova' | 'antiga';
  cargoType: 'plastico' | 'porcelana' | 'consolidado';
  deliveries: DeliveryDetail[];
  deliveryDate: string;
  releasedToLoading?: boolean;
  createdAt: number;
  createdBy: string;
}

export type RouteFormData = Omit<Route, 'id' | 'createdAt' | 'createdBy'>;
