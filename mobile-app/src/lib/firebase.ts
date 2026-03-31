import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { 
  initializeAuth, 
  connectAuthEmulator, 
  browserLocalPersistence 
} from 'firebase/auth';
// @ts-ignore
import { getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyBvBUbce_B7lVUvStwGGxi1ILgtOquy_NA",
  authDomain: "por1-29f82.firebaseapp.com",
  projectId: "por1-29f82",
  storageBucket: "por1-29f82.firebasestorage.app",
  messagingSenderId: "254820312531",
  appId: "1:254820312531:web:6070968c86b3e487b1bb26"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth = initializeAuth(app, {
  persistence: Platform.OS === 'web' 
    ? browserLocalPersistence 
    : getReactNativePersistence(AsyncStorage)
});

const db = getFirestore(app);

// Use us-central1 or the region you deploy to
const firebaseFunctions = getFunctions(app, 'us-central1');

// Descomente para usar emuladores (requer Java 11+ e emulador rodando)
/*
if (__DEV__) {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectFunctionsEmulator(firebaseFunctions, 'localhost', 5001);
  connectAuthEmulator(auth, 'http://localhost:9099');
}
*/

export { app, auth, db, firebaseFunctions as functions };
