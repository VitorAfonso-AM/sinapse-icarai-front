import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBvjP4lAN5n9enLyhU1LIEs7YVBf-mZfbE",
  authDomain: "sinapse-neurocare-53ffc.firebaseapp.com",
  databaseURL: "https://sinapse-neurocare-53ffc-default-rtdb.firebaseio.com",
  projectId: "sinapse-neurocare-53ffc",
  storageBucket: "sinapse-neurocare-53ffc.appspot.com",
  messagingSenderId: "247071047127",
  appId: "1:247071047127:web:88a49ee7a8f64551b55f92",
  measurementId: "G-2VDMQDXX4Y"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);

export default app;