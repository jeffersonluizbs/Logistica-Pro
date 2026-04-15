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
  releaseRoute: async (route: Route): Promise<boolean> => {
    if (!GAS_WEB_APP_URL) {
      console.warn('URL do Apps Script não configurada.');
      return false;
    }

    try {
      // Usando POST com text/plain evita o preflight (OPTIONS) do CORS
      // O Apps Script vai receber o JSON em e.postData.contents perfeitamente
      await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({
          action: 'salvarNovoCard',
          dados: {
            rota: route.deliveries.map(d => d.clientName).join(', '),
            dataSep: new Date().toLocaleDateString('pt-BR'),
            veiculo: '',
            conferente: '',
            nRota: '', 
            valor: 'R$ 0,00',
            iniSep: '',
            fimSep: '',
            qtd: route.deliveries.length.toString(),
            iniCar: '',
            fimCar: '',
            motorista: '',
            doca: '',
            planta: '',
            nRotaLog: route.routeNumber
          }
        }),
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
