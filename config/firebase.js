import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: "AIzaSyBwjiee7KekbZXrdl9LBaTWqCkSpKa_rKY",
  authDomain: "chesa-dashboards.firebaseapp.com",
  projectId: "chesa-dashboards",
  storageBucket: "chesa-dashboards.firebasestorage.app",
  messagingSenderId: "442787713847",
  appId: "1:442787713847:web:423caa6e4a8bd9f03500b2",
  measurementId: "G-DPGWZZRP9Z"
};

const app = initializeApp(firebaseConfig);

export default app;
