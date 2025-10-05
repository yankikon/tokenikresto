// Authentication service for Google OAuth
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  getDoc,
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { auth, googleProvider, db } from "./firebase-config.js";

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Create user document in Firestore if it doesn't exist
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      });
    } else {
      // Update last login time
      await setDoc(userRef, {
        lastLogin: new Date().toISOString()
      }, { merge: true });
    }
    
    return { success: true, user };
  } catch (error) {
    console.error('Error signing in with Google:', error);
    return { success: false, error: error.message };
  }
};

// Sign out
export const signOutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Error signing out:', error);
    return { success: false, error: error.message };
  }
};

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Listen to auth state changes
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Get user's orders from Firestore
export const getUserOrders = async (userId) => {
  try {
    const ordersRef = collection(db, 'users', userId, 'orders');
    const ordersSnapshot = await getDocs(ordersRef);
    const orders = [];
    
    ordersSnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() });
    });
    
    return orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (error) {
    console.error('Error getting user orders:', error);
    return [];
  }
};

// Save order to Firestore
export const saveOrderToFirestore = async (userId, order) => {
  try {
    const ordersRef = collection(db, 'users', userId, 'orders');
    const orderData = {
      ...order,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const docRef = await setDoc(doc(ordersRef), orderData);
    return { success: true, orderId: docRef.id };
  } catch (error) {
    console.error('Error saving order:', error);
    return { success: false, error: error.message };
  }
};

// Update order in Firestore
export const updateOrderInFirestore = async (userId, orderId, updates) => {
  try {
    const orderRef = doc(db, 'users', userId, 'orders', orderId);
    await setDoc(orderRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating order:', error);
    return { success: false, error: error.message };
  }
};

// Delete order from Firestore
export const deleteOrderFromFirestore = async (userId, orderId) => {
  try {
    const orderRef = doc(db, 'users', userId, 'orders', orderId);
    await setDoc(orderRef, { deleted: true, deletedAt: new Date().toISOString() }, { merge: true });
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting order:', error);
    return { success: false, error: error.message };
  }
};
