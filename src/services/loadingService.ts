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
      // Usando no-cors com POST novamente, mas passando os dados como form-data
      // que é mais amigável para o Apps Script
      const formData = new FormData();
      formData.append('action', 'salvarNovoCard');
      formData.append('rota', route.deliveries.map(d => d.clientName).join(', '));
      formData.append('dataSep', new Date().toLocaleDateString('pt-BR'));
      formData.append('qtd', route.deliveries.length.toString());
      formData.append('nRotaLog', route.routeNumber);

      await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: formData
      });
      
      // Como usamos no-cors, não podemos ler a resposta, assumimos sucesso se não der erro de rede
      return true;
    } catch (error) {
      console.error('Erro ao liberar rota:', error);
      return false;
    }
  },

  // Função para buscar os dados do painel de carregamento
  getLoadingData: async (): Promise<{ cards: LoadingCard[], painel: any } | null> => {
    if (!GAS_WEB_APP_URL) return null;

    return new Promise((resolve) => {
      // Usando JSONP para contornar o CORS na leitura
      const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
      
      (window as any)[callbackName] = (data: any) => {
        delete (window as any)[callbackName];
        document.body.removeChild(script);
        resolve(data);
      };

      const script = document.createElement('script');
      script.src = `${GAS_WEB_APP_URL}?action=getDadosIniciais&callback=${callbackName}`;
      script.onerror = () => {
        delete (window as any)[callbackName];
        document.body.removeChild(script);
        resolve(null);
      };
      
      document.body.appendChild(script);
    });
  }
};
