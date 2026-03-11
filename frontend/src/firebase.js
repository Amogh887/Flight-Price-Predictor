// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA2xcEEuCpXx7LOMid0IlKn-couPYYRF8M",
  authDomain: "flightpricetracker-2e89d.firebaseapp.com",
  projectId: "flightpricetracker-2e89d",
  storageBucket: "flightpricetracker-2e89d.firebasestorage.app",
  messagingSenderId: "653740001890",
  appId: "1:653740001890:web:3b3ef9123c972035c69f3b",
  measurementId: "G-DX2E3RTMX1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export default app;
