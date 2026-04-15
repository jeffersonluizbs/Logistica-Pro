import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { Route, RouteFormData } from '@/types';

const COLLECTION_NAME = 'routes';

export const routeService = {
  // Real-time listener
  subscribeToRoutes: (callback: (routes: Route[]) => void) => {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const routes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Route));
      callback(routes);
    }, (error) => {
      console.error("Erro ao escutar rotas:", error);
    });
  },

  addRoute: async (formData: RouteFormData): Promise<string> => {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuário não autenticado');

    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...formData,
      createdAt: Date.now(), // Usando timestamp numérico para manter compatibilidade com o tipo
      createdBy: user.uid,
    });
    return docRef.id;
  },

  deleteRoute: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  },

  updateRoute: async (id: string, formData: RouteFormData): Promise<void> => {
    const routeRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(routeRef, {
      ...formData
    });
  }
};
