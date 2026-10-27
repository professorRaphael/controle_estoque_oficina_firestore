import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, inMemoryPersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// São identificadores públicos do projeto, não segredos de servidor.
// O controle de acesso é feito no Authentication + Firestore Security Rules.
const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

const app = getApps().length ? getApp() : initializeApp(config);

// Para simplificar a aula, a sessão fica só em memória (login novamente ao reiniciar).
// A persistência da sessão é um exercício de continuação.
export const auth = (() => {
  try {
    return initializeAuth(app, { persistence: inMemoryPersistence });
  } catch (error: unknown) {
    // Hot reload pode encontrar Auth já inicializado no mesmo app.
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'auth/already-initialized') {
      return getAuth(app);
    }
    throw error;
  }
})();

export const db = getFirestore(app);
