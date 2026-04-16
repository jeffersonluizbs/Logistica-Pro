import { Route } from '@/types';

// O usuário precisará fornecer a URL do Web App do Google Apps Script após implantá-lo
// como "Qualquer pessoa" (Anyone).
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbw0EEEUOla4dTj7T9McfhxeAkQhZzwyAie-tvcvErGQegk-pka5kaY_kSIMkYo7JmOV8Q/exec'; 

export interface LoadingCard {
  id: string;
  status: string;
  rota: string;
  dataSep: string;
  veiculo: string;
  conferente: string;
  nRota: string;
  valor: string;
  iniSep: string;
  fimSep: string;
  qtd: string;
  iniCar: string;
  fimCar: string;
  motorista: string;
  fotoUrl: string;
  dataConclusao: string;
  doca: string;
  planta: string;
  nRotaLog: string;
  isAcumulado: boolean;
}

export const loadingService = {
  // Função para liberar a rota para o painel de carregamento (GAS)
  releaseRoute: async (route: Route, releaseDateStr: string): Promise<boolean> => {
    if (!GAS_WEB_APP_URL) {
      console.warn('URL do Apps Script não configurada.');
      return false;
    }

    try {
      // Usando application/x-www-form-urlencoded para que o Apps Script 
      // consiga ler os dados diretamente em e.parameter
      const params = new URLSearchParams();
      params.append('action', 'salvarNovoCard');
      
      // Contar entregas por local e formatar como "Local Xent"
      const locationCounts = route.deliveries.reduce((acc, d) => {
        if (d.location) {
          acc[d.location] = (acc[d.location] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const rotaFormatada = Object.entries(locationCounts)
        .map(([location, count]) => `${location} ${count}ent`)
        .join(', ');

      params.append('rota', rotaFormatada);
      
      // Format releaseDateStr (YYYY-MM-DD) to DD/MM/YYYY
      const [year, month, day] = releaseDateStr.split('-');
      params.append('dataSep', `${day}/${month}/${year}`);

      params.append('qtd', route.deliveries.length.toString());
      params.append('nRota', route.routeNumber);
      params.append('nRotaLog', route.routeNumber);

      await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      
      return true;
    } catch (error) {
      console.error('Erro ao liberar rota:', error);
      return false;
    }
  },

  // Função para buscar os dados do painel de carregamento
  getLoadingData: async (): Promise<{ cards: LoadingCard[], painel: any } | null> => {
    if (!GAS_WEB_APP_URL) return null;

    try {
      // O Apps Script redireciona GETs de ContentService para um subdomínio que permite CORS
      const response = await fetch(`${GAS_WEB_APP_URL}?action=getDadosIniciais`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erro ao buscar dados do carregamento:', error);
      return null;
    }
  }
};
