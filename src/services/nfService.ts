export const nfService = {
  fetchNFs: async (orders: string[], url: string): Promise<Record<string, string>> => {
    if (!orders.length) return {};
    
    // Chunk orders to avoid excessively long URLs
    const chunks = [];
    for (let i = 0; i < orders.length; i += 40) {
      chunks.push(orders.slice(i, i + 40));
    }
    
    let allResults = {};
    for (const chunk of chunks) {
      const params = new URLSearchParams();
      params.append('action', 'getNFs');
      params.append('pedidos', JSON.stringify(chunk));
      
      try {
        const res = await fetch(`${url}?${params.toString()}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        const data = await res.json();
        allResults = { ...allResults, ...data };
      } catch (error) {
        console.error("Erro ao buscar NFs chunk:", error);
      }
    }
    return allResults;
  }
};
