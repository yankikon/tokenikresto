// Firebase configuration and initialization
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDLsNt7R642AlKOQXi7v2ZSXyo799PLdY8",
  authDomain: "tokenik-manage-kitchen-orders.firebaseapp.com",
  projectId: "tokenik-manage-kitchen-orders",
  storageBucket: "tokenik-manage-kitchen-orders.firebasestorage.app",
  messagingSenderId: "425760092391",
  appId: "1:425760092391:web:95534c87d30a21b8d6f242",
  measurementId: "G-NEPZ5XVTKW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

export { auth, googleProvider, db };
