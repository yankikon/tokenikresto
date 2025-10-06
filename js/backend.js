const { useState, useEffect } = React;

// Tokenik Restaurant Token App - Backend (Updated with Firebase Integration)

// Firebase configuration
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
const app = window.Firebase.initializeApp(firebaseConfig);
const auth = window.Firebase.getAuth(app);
const db = window.Firebase.getFirestore(app);


function QSRBackend() {
  console.log('QSRBackend component rendering...');
  const [activeTab, setActiveTab] = useState('orders');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuTab, setMenuTab] = useState('kitchen');
  const [orderSubTab, setOrderSubTab] = useState('kitchen');
  const [takeOrderTab, setTakeOrderTab] = useState('kitchen');
  const [orderMainTab, setOrderMainTab] = useState('active');
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', price: '' , category: '' });
  const [cart, setCart] = useState({});
  const [editingOrder, setEditingOrder] = useState(null);
  const [editingMenuItem, setEditingMenuItem] = useState(null);
  const [clickedButtons, setClickedButtons] = useState({});
  const [orderCurrentStatus, setOrderCurrentStatus] = useState({}); // Track current status for each order
  const [orderCounters, setOrderCounters] = useState({ kitchen: 0, bar: 0 });
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'preparing', 'ready', 'delivered'
  const [selectedTable, setSelectedTable] = useState(''); // Selected table number
  const [selectedDate, setSelectedDate] = useState(''); // Selected date for filtering completed orders

  // Authentication effect
  useEffect(() => {
    const unsubscribe = window.Firebase.onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        await loadUserData(user.uid);
      } else {
        setUser(null);
        window.location.href = 'login.html';
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load user data from Firestore
  const loadUserData = async (userId) => {
    try {
      // Clear localStorage for new user session
      localStorage.removeItem('qsrOrders');
      localStorage.removeItem('qsrMenuItems');
      
      // Load orders - simplified query to avoid index requirements
      const ordersRef = window.Firebase.collection(db, 'users', userId, 'orders');
      const ordersSnapshot = await window.Firebase.getDocs(ordersRef);
      const userOrders = [];
      
      ordersSnapshot.forEach((doc) => {
        const orderData = doc.data();
        // Filter out deleted orders and sort by createdAt
        if (!orderData.deleted) {
          userOrders.push({ id: doc.id, ...orderData });
        }
      });
      
      // Sort by createdAt descending
      userOrders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      
      setOrders(userOrders);

      // Load menu items
      const menuRef = window.Firebase.collection(db, 'users', userId, 'menu');
      const menuSnapshot = await window.Firebase.getDocs(menuRef);
      const userMenuItems = [];
      
      menuSnapshot.forEach((doc) => {
        userMenuItems.push({ id: doc.id, ...doc.data() });
      });
      
      // Always set menu items (even if empty array)
      setMenuItems(userMenuItems);
      
      console.log(`Loaded ${userOrders.length} orders and ${userMenuItems.length} menu items for user ${userId}`);
      
      // If user has no menu items, offer to add sample items
      if (userMenuItems.length === 0) {
        console.log('New user detected - no menu items found');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      // For new users, start with empty arrays
      setOrders([]);
      setMenuItems([]);
    }
  };

  // Save orders to Firestore
  const saveOrdersToFirestore = async (ordersToSave) => {
    if (!user) return;
    
    try {
      const ordersRef = window.Firebase.collection(db, 'users', user.uid, 'orders');
      
      for (const order of ordersToSave) {
        // Clean the order data to ensure it's Firestore-compatible
        const orderData = {
          id: order.id,
          token: order.token,
          items: order.items,
          status: order.status,
          queue: order.queue,
          timestamp: order.timestamp,
          date: order.date,
          userId: user.uid,
          createdAt: order.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deliveredAt: order.deliveredAt || null,
          billingStatus: order.billingStatus || null
        };
        
        // Remove any undefined or null values that might cause issues
        Object.keys(orderData).forEach(key => {
          if (orderData[key] === undefined) {
            delete orderData[key];
          }
        });
        
        if (order.id) {
          await window.Firebase.setDoc(window.Firebase.doc(ordersRef, order.id), orderData, { merge: true });
        }
      }
    } catch (error) {
      console.error('Error saving orders to Firestore:', error);
    }
  };

  // Save menu items to Firestore
  const saveMenuItemsToFirestore = async (itemsToSave) => {
    if (!user) return;
    
    try {
      const menuRef = window.Firebase.collection(db, 'users', user.uid, 'menu');
      
      for (const item of itemsToSave) {
        // Clean the menu item data to ensure it's Firestore-compatible
        const itemData = {
          id: item.id,
          name: item.name,
          price: typeof item.price === 'number' ? item.price : parseFloat(item.price),
          category: item.category,
          userId: user.uid,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Remove any undefined values
        Object.keys(itemData).forEach(key => {
          if (itemData[key] === undefined) {
            delete itemData[key];
          }
        });
        
        if (item.id) {
          await window.Firebase.setDoc(window.Firebase.doc(menuRef, item.id), itemData, { merge: true });
        }
      }
    } catch (error) {
      console.error('Error saving menu items to Firestore:', error);
    }
  };

  // Update orders effect - disabled automatic saving to prevent conflicts
  // useEffect(() => {
  //   if (user && orders.length > 0) {
  //     saveOrdersToFirestore(orders);
  //   }
  // }, [orders, user]);

  // Real-time listener for menu items
  useEffect(() => {
    if (!user) {
      console.log('No user, skipping menu items listener setup');
      return;
    }
    
    console.log('=== SETTING UP MENU ITEMS LISTENER ===');
    console.log('User:', user.uid);
    console.log('Firebase instances:', { Firebase: !!window.Firebase, db: !!db });
    
    const menuRef = window.Firebase.collection(db, 'users', user.uid, 'menu');
    console.log('Menu reference created:', menuRef);
    
    const unsubscribe = window.Firebase.onSnapshot(menuRef, (snapshot) => {
      console.log('=== MENU ITEMS SNAPSHOT RECEIVED ===');
      console.log('Snapshot size:', snapshot.size);
      console.log('Snapshot empty:', snapshot.empty);
      
      const userMenuItems = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Menu item found:', { id: doc.id, data });
        userMenuItems.push({ id: doc.id, ...data });
      });
      
      console.log('=== FINAL MENU ITEMS ===');
      console.log('Total menu items loaded:', userMenuItems.length);
      console.log('Menu items array:', userMenuItems);
      
      setMenuItems(userMenuItems);
    }, (error) => {
      console.error('=== ERROR IN MENU ITEMS LISTENER ===');
      console.error('Error details:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
    });

    return () => {
      console.log('=== CLEANING UP MENU ITEMS LISTENER ===');
      unsubscribe();
    };
  }, [user]);

  const generateToken = (queue) => {
    let counterKey = 'kitchen';
    if (queue === 'Bar') {
      counterKey = 'bar';
    } else if (queue === 'Both') {
      // For mixed orders, default to Kitchen
      counterKey = 'kitchen';
    }
    
    // Ensure orderCounters has default values
    const currentCounters = {
      kitchen: orderCounters.kitchen || 0,
      bar: orderCounters.bar || 0
    };
    
    const newCounterValue = currentCounters[counterKey] + 1;
    
    setOrderCounters(prev => ({
      ...prev,
      [counterKey]: newCounterValue
    }));
    
    const paddedNumber = newCounterValue.toString().padStart(4, '0');
    
    if (queue === 'Kitchen' || queue === 'Both') {
      return `K-${paddedNumber}`;
    } else if (queue === 'Bar') {
      return `B-${paddedNumber}`;
    }
    return `T-${paddedNumber}`; // fallback
  };

  const addMenuItem = async () => {
    console.log('Adding menu item:', newItem);
    if (newItem.name && newItem.price) {
      if (editingMenuItem) {
        await updateMenuItem();
      } else {
        const category = menuTab === 'kitchen' ? 'Kitchen' : 'Bar';
        const menuItemId = Date.now().toString();
        const newMenuItem = {
          id: menuItemId,
          name: newItem.name.trim(),
          price: parseFloat(newItem.price),
          category: category,
          userId: user ? user.uid : null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        try {
          // Save to Firestore
          const menuRef = window.Firebase.collection(db, 'users', user.uid, 'menu');
          await window.Firebase.setDoc(window.Firebase.doc(menuRef, menuItemId), newMenuItem);
          console.log('Menu item saved to Firestore:', newMenuItem);
          
          // Update local state
          setMenuItems([...menuItems, newMenuItem]);
          setNewItem({ name: '', price: '', category: '' });
        } catch (error) {
          console.error('Error saving menu item to Firestore:', error);
          alert('Error saving menu item. Please try again.');
        }
      }
    } else {
      console.log('Validation failed:', { name: newItem.name, price: newItem.price });
    }
  };

  const deleteMenuItem = async (id) => {
    try {
      // Delete from Firestore
      const menuRef = window.Firebase.collection(db, 'users', user.uid, 'menu');
      await window.Firebase.deleteDoc(window.Firebase.doc(menuRef, id));
      console.log('Menu item deleted from Firestore:', id);
      
      // Update local state
    setMenuItems(menuItems.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error deleting menu item from Firestore:', error);
      alert('Error deleting menu item. Please try again.');
    }
  };

  const startEditMenuItem = (item) => {
    setEditingMenuItem(item.id);
    setNewItem({ name: item.name, price: item.price.toString(), category: item.category });
  };

  const updateMenuItem = async () => {
    if (newItem.name && newItem.price) {
      const category = menuTab === 'kitchen' ? 'Kitchen' : 'Bar';
      const updatedMenuItem = {
        name: newItem.name.trim(),
        price: parseFloat(newItem.price),
        category: category,
        userId: user.uid,
        updatedAt: new Date().toISOString()
      };
      
      try {
        // Update in Firestore
        const menuRef = window.Firebase.collection(db, 'users', user.uid, 'menu');
        await window.Firebase.setDoc(window.Firebase.doc(menuRef, editingMenuItem), updatedMenuItem, { merge: true });
        console.log('Menu item updated in Firestore:', updatedMenuItem);
        
        // Update local state
        setMenuItems(menuItems.map(item => 
          item.id === editingMenuItem 
            ? { ...item, ...updatedMenuItem }
            : item
        ));
        setNewItem({ name: '', price: '', category: '' });
        setEditingMenuItem(null);
      } catch (error) {
        console.error('Error updating menu item in Firestore:', error);
        alert('Error updating menu item. Please try again.');
      }
    }
  };

  const cancelEditMenuItem = () => {
    setNewItem({ name: '', price: '', category: '' });
    setEditingMenuItem(null);
  };

  const updateCart = (itemId, change) => {
    console.log('updateCart called:', { itemId, change, menuItemsCount: menuItems.length });
    console.log('Menu items available:', menuItems);
    
    // Check if the item exists in menu items (using string ID)
    const menuItem = menuItems.find(m => m.id === itemId);
    console.log('Menu item found for ID', itemId, ':', menuItem);
    
    if (!menuItem && change > 0) {
      console.error('Menu item not found for ID:', itemId);
      alert('Menu item not found. Please refresh the page and try again.');
      return;
    }
    
    setCart(prev => {
      const newCart = { ...prev };
      const currentQty = newCart[itemId] || 0;
      const newQty = currentQty + change;
      
      console.log('Cart update:', { itemId, currentQty, change, newQty });
      
      if (newQty <= 0) {
        delete newCart[itemId];
      } else {
        newCart[itemId] = newQty;
      }
      
      console.log('New cart state:', newCart);
      return newCart;
    });
  };

  const placeOrder = async () => {
    if (Object.keys(cart).length === 0 || !user) return;
    
    // Check if table number is selected
    if (!selectedTable) {
      alert('Please select a table number before placing the order.');
      return;
    }
    
    console.log('Cart items:', Object.entries(cart));
    console.log('Available menu items:', menuItems);
    
    const orderItems = Object.entries(cart)
      .map(([itemId, qty]) => {
        const item = menuItems.find(m => m.id === itemId);
        console.log(`Looking for item ID ${itemId}, found:`, item);
        return item ? { ...item, quantity: qty } : null;
      })
      .filter(item => item !== null); // Remove any null items
    
    console.log('Final order items:', orderItems);
    
    // Check if we have valid items
    if (orderItems.length === 0) {
      console.error('No valid items found in cart');
      alert('No valid items found in cart. Please check that menu items are loaded and try again.');
      return;
    }

    // Determine queue based on item categories
    const hasBarItems = orderItems.some(item => item.category === 'Bar');
    const hasKitchenItems = orderItems.some(item => item.category === 'Kitchen');
    
    let queue = 'Kitchen'; // Default
    if (hasBarItems && !hasKitchenItems) {
      queue = 'Bar';
    } else if (hasBarItems && hasKitchenItems) {
      queue = 'Both';
    }

    const orderId = Date.now().toString();
    
    // Clean order items to ensure they're Firestore-compatible
    const cleanOrderItems = orderItems.map(item => {
      const cleanItem = {
        id: item.id || null,
        name: item.name || '',
        price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
        category: item.category || 'Kitchen',
        quantity: typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity) || 1
      };
      
      // Remove any undefined values
      Object.keys(cleanItem).forEach(key => {
        if (cleanItem[key] === undefined) {
          delete cleanItem[key];
        }
      });
      
      return cleanItem;
    });

    const newOrder = {
      id: orderId,
      token: generateToken(queue),
      items: cleanOrderItems,
      status: 'pending',
      queue: queue,
      tableNumber: selectedTable,
      timestamp: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString(),
      userId: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Remove any undefined values from the main order object
    Object.keys(newOrder).forEach(key => {
      if (newOrder[key] === undefined) {
        delete newOrder[key];
      }
    });
    
    // Save to Firestore
    try {
      console.log('=== DEBUGGING ORDER DATA ===');
      console.log('Raw newOrder object:', JSON.stringify(newOrder, null, 2));
      console.log('User ID:', user.uid);
      console.log('Firebase instances:', { Firebase: !!window.Firebase, db: !!db });
      
      // Deep clean the order object to remove any undefined values
      const cleanedOrder = JSON.parse(JSON.stringify(newOrder, (key, value) => {
        if (value === undefined) {
          console.warn(`Found undefined value for key: ${key}`);
          return null;
        }
        return value;
      }));
      
      // Remove null values as well
      Object.keys(cleanedOrder).forEach(key => {
        if (cleanedOrder[key] === null || cleanedOrder[key] === undefined) {
          console.warn(`Removing null/undefined value for key: ${key}`);
          delete cleanedOrder[key];
        }
      });
      
      console.log('Cleaned order object:', JSON.stringify(cleanedOrder, null, 2));
      
      const ordersRef = window.Firebase.collection(db, 'users', user.uid, 'orders');
      const orderDoc = window.Firebase.doc(ordersRef, orderId);
      
      console.log('Orders reference:', ordersRef);
      console.log('Order document reference:', orderDoc);
      
      await window.Firebase.setDoc(orderDoc, cleanedOrder);
      console.log('Order saved successfully to Firestore with ID:', orderId);
      
      // Update local state
    setOrders([newOrder, ...orders]);
    setCart({});
      setSelectedTable(''); // Clear selected table
    } catch (error) {
      console.error('Error saving order to Firestore:', error);
      console.error('Error details:', error.message);
      console.error('Error code:', error.code);
      
      // Fallback to local state
      setOrders([newOrder, ...orders]);
      setCart({});
      setSelectedTable(''); // Clear selected table
      
      // Show user-friendly error message
      alert('Order placed successfully, but there was an issue saving to cloud storage. Your order is saved locally.');
    }
  };

  // Add sample menu items for new users
  const addSampleMenuItems = async () => {
    if (!user) return;
    
    const sampleItems = [
      { name: 'Masala Dosa', price: 80, category: 'Kitchen' },
      { name: 'Idli Sambhar', price: 60, category: 'Kitchen' },
      { name: 'Filter Coffee', price: 40, category: 'Bar' },
      { name: 'Vada', price: 50, category: 'Kitchen' }
    ];
    
    try {
      const menuRef = window.Firebase.collection(db, 'users', user.uid, 'menu');
      const newMenuItems = [];
      
      for (const item of sampleItems) {
        const menuItemId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const menuItemData = {
          id: menuItemId,
          name: item.name,
          price: item.price,
          category: item.category,
          userId: user.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await window.Firebase.setDoc(window.Firebase.doc(menuRef, menuItemId), menuItemData);
        newMenuItems.push(menuItemData);
      }
      
      setMenuItems(newMenuItems);
      alert('Sample menu items added! You can edit or delete them in Menu Management.');
    } catch (error) {
      console.error('Error adding sample menu items:', error);
      alert('Error adding sample menu items. Please try again.');
    }
  };

  // Sign out function
  const handleSignOut = async () => {
    try {
      await window.Firebase.signOut(auth);
      window.location.href = 'index.html';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      // Update in Firestore
      const ordersRef = window.Firebase.collection(db, 'users', user.uid, 'orders');
      await window.Firebase.setDoc(window.Firebase.doc(ordersRef, orderId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log('Order status updated in Firestore:', orderId, newStatus);
      
      // Update local state
    setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus, updatedAt: new Date().toISOString() } : order
      ));
      
      // Track current status for this order
      setOrderCurrentStatus(prev => ({
        ...prev,
        [orderId]: newStatus
      }));
    } catch (error) {
      console.error('Error updating order status in Firestore:', error);
      alert('Error updating order status. Please try again.');
    }
  };

  const deliverOrder = async (orderId) => {
    try {
      const deliveredData = {
        status: 'delivered',
        deliveredAt: new Date().toISOString(),
        billingStatus: 'pending_billing',
        updatedAt: new Date().toISOString()
      };
      
      // Update in Firestore
      const ordersRef = window.Firebase.collection(db, 'users', user.uid, 'orders');
      await window.Firebase.setDoc(window.Firebase.doc(ordersRef, orderId), deliveredData, { merge: true });
      console.log('Order delivered in Firestore:', orderId);
      
      // Update local state
    setOrders(orders.map(order => 
        order.id === orderId ? { ...order, ...deliveredData } : order
      ));
      
      // Track current status for this order
      setOrderCurrentStatus(prev => ({
        ...prev,
        [orderId]: 'delivered'
      }));
    } catch (error) {
      console.error('Error delivering order in Firestore:', error);
      alert('Error delivering order. Please try again.');
    }
  };

  const completeBilling = async (orderId) => {
    if (confirm('Are you sure you have completed this billing on pikonik?')) {
      try {
        // Update status to billing_completed instead of deleting
        const ordersRef = window.Firebase.collection(db, 'users', user.uid, 'orders');
        await window.Firebase.setDoc(window.Firebase.doc(ordersRef, orderId), {
          billingStatus: 'billing_completed',
          billingCompletedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log('Order billing completed in Firestore:', orderId);
        
        // Update local state
        setOrders(orders.map(order => 
          order.id === orderId 
            ? { ...order, billingStatus: 'billing_completed', billingCompletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
            : order
        ));
      } catch (error) {
        console.error('Error completing billing in Firestore:', error);
        alert('Error completing billing. Please try again.');
      }
    }
  };

  const deleteOrder = async (orderId) => {
    if (confirm('Are you sure you want to cancel this order?')) {
      try {
        // Mark as deleted in Firestore instead of actually deleting
        const ordersRef = window.Firebase.collection(db, 'users', user.uid, 'orders');
        await window.Firebase.setDoc(window.Firebase.doc(ordersRef, orderId), {
          deleted: true,
          cancelledAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log('Order cancelled in Firestore:', orderId);
        
        // Remove from local state
      setOrders(orders.filter(order => order.id !== orderId));
      } catch (error) {
        console.error('Error cancelling order in Firestore:', error);
        alert('Error cancelling order. Please try again.');
      }
    }
  };

  const startEditOrder = (order) => {
    setEditingOrder(order.id);
    const editCart = {};
    order.items.forEach(item => {
      editCart[item.id] = item.quantity;
    });
    setCart(editCart);
    setActiveTab('takeOrder');
  };

  const updateOrder = () => {
    if (Object.keys(cart).length === 0 || !editingOrder) return;
    
    const orderItems = Object.entries(cart)
      .map(([itemId, qty]) => {
        const item = menuItems.find(m => m.id === itemId);
        return item ? { ...item, quantity: qty } : null;
      })
      .filter(item => item !== null); // Remove any null items
    
    // Check if we have valid items
    if (orderItems.length === 0) {
      console.error('No valid items found in cart for update');
      alert('No valid items found in cart. Please try again.');
      return;
    }

    setOrders(orders.map(order => 
      order.id === editingOrder 
        ? { ...order, items: orderItems }
        : order
    ));
    
    setCart({});
    setSelectedTable(''); // Clear selected table
    setEditingOrder(null);
    setActiveTab('orders');
  };

  const cancelEdit = () => {
    setCart({});
    setSelectedTable(''); // Clear selected table
    setEditingOrder(null);
    setActiveTab('orders');
  };

  const getTotalItems = () => {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  };

  const getTotalPrice = () => {
    return Object.entries(cart).reduce((sum, [itemId, qty]) => {
      const item = menuItems.find(m => m.id === itemId);
      return sum + (item ? item.price * qty : 0);
    }, 0);
  };

  // Show loading screen while authenticating
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please sign in to continue</p>
          <a href="login.html" className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Pikonik Logo */}
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center p-1">
                <img src="./assets/Pikonik Transparent Logo.png" alt="Pikonik Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
                <p className="text-sm text-gray-500">TOKENIK (RESTAURANT TOKEN APP)</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {user.photoURL && (
                  <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full" />
                )}
                <span className="text-sm text-gray-700">{user.displayName || user.email}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="text-orange-600 hover:text-orange-700 font-medium"
              >
                Sign Out
              </button>
              <a href="index.html" className="text-orange-600 hover:text-orange-700 font-medium">← Back to Home</a>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-6 py-3 font-medium transition-all ${
                activeTab === 'orders'
                  ? 'text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Order Management
            </button>
            <button
              onClick={() => setActiveTab('takeOrder')}
              className={`px-6 py-3 font-medium transition-all ${
                activeTab === 'takeOrder'
                  ? 'text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Take Order
            </button>
            <button
              onClick={() => setActiveTab('menu')}
              className={`px-6 py-3 font-medium transition-all ${
                activeTab === 'menu'
                  ? 'text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Menu Management
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Order Type Buttons */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-4">
                <label className="text-lg font-semibold text-gray-900">
                  Order Type:
                </label>
                <div className="flex gap-2">
                <button
                    onClick={() => {
                      setOrderMainTab('active');
                      setOrderSubTab('kitchen'); // Reset to default sub-tab for active orders
                      setStatusFilter('all'); // Reset filter when switching order types
                    }}
                    className={`px-6 py-3 rounded-lg font-medium transition-all border-2 ${
                      orderMainTab === 'active'
                        ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                    }`}
                  >
                    📋 Active Orders
                </button>
                <button
                    onClick={() => {
                      setOrderMainTab('completed');
                      setOrderSubTab('pending'); // Default to pending billing when switching to completed
                      setStatusFilter('all'); // Reset filter when switching order types
                    }}
                    className={`px-6 py-3 rounded-lg font-medium transition-all border-2 ${
                      orderMainTab === 'completed'
                        ? 'bg-green-500 text-white border-green-500 shadow-md'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                    }`}
                  >
                    ✅ Completed Orders
                </button>
                </div>
              </div>
            </div>

            {/* Order Summary Statistics */}
            {orderMainTab === 'active' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Order Summary</h3>
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      statusFilter === 'all'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Show All Orders
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button
                    onClick={() => setStatusFilter('pending')}
                    className={`border rounded-lg p-4 text-center transition-all ${
                      statusFilter === 'pending'
                        ? 'bg-yellow-500 border-yellow-500 text-white'
                        : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
                    }`}
                  >
                    <div className={`text-2xl font-bold ${statusFilter === 'pending' ? 'text-white' : 'text-yellow-800'}`}>
                      {orders.filter(o => o.status === 'pending' && o.status !== 'delivered').length}
                    </div>
                    <div className={`text-sm ${statusFilter === 'pending' ? 'text-white' : 'text-yellow-600'}`}>Pending</div>
                  </button>
                  <button
                    onClick={() => setStatusFilter('preparing')}
                    className={`border rounded-lg p-4 text-center transition-all ${
                      statusFilter === 'preparing'
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    <div className={`text-2xl font-bold ${statusFilter === 'preparing' ? 'text-white' : 'text-blue-800'}`}>
                      {orders.filter(o => o.status === 'preparing' && o.status !== 'delivered').length}
                    </div>
                    <div className={`text-sm ${statusFilter === 'preparing' ? 'text-white' : 'text-blue-600'}`}>Preparing</div>
                  </button>
                  <button
                    onClick={() => setStatusFilter('ready')}
                    className={`border rounded-lg p-4 text-center transition-all ${
                      statusFilter === 'ready'
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'bg-green-50 border-green-200 hover:bg-green-100'
                    }`}
                  >
                    <div className={`text-2xl font-bold ${statusFilter === 'ready' ? 'text-white' : 'text-green-800'}`}>
                      {orders.filter(o => o.status === 'ready' && o.status !== 'delivered').length}
                    </div>
                    <div className={`text-sm ${statusFilter === 'ready' ? 'text-white' : 'text-green-600'}`}>Ready</div>
                  </button>
                  <button
                    onClick={() => setStatusFilter('delivered')}
                    className={`border rounded-lg p-4 text-center transition-all ${
                      statusFilter === 'delivered'
                        ? 'bg-purple-500 border-purple-500 text-white'
                        : 'bg-purple-50 border-purple-200 hover:bg-purple-100'
                    }`}
                  >
                    <div className={`text-2xl font-bold ${statusFilter === 'delivered' ? 'text-white' : 'text-purple-800'}`}>
                      {orders.filter(o => o.status === 'delivered').length}
                    </div>
                    <div className={`text-sm ${statusFilter === 'delivered' ? 'text-white' : 'text-purple-600'}`}>Delivered</div>
                  </button>
                </div>
              </div>
            )}

            {orderMainTab === 'completed' && (
              <div>
                <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Summary</h3>
                  <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      setOrderSubTab('pending');
                      setOrderMainTab('completed');
                    }}
                    className={`border rounded-lg p-4 text-center transition-all ${
                      orderSubTab === 'pending' && orderMainTab === 'completed'
                        ? 'bg-yellow-500 border-yellow-500 text-white'
                        : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
                    }`}
                  >
                    <div className={`text-2xl font-bold ${orderSubTab === 'pending' && orderMainTab === 'completed' ? 'text-white' : 'text-yellow-800'}`}>
                      {orders.filter(o => o.status === 'delivered' && (o.billingStatus === 'pending_billing' || !o.billingStatus)).length}
                    </div>
                    <div className={`text-sm ${orderSubTab === 'pending' && orderMainTab === 'completed' ? 'text-white' : 'text-yellow-600'}`}>Pending Billing</div>
                  </button>
                  <button
                    onClick={() => {
                      setOrderSubTab('completed');
                      setOrderMainTab('completed');
                    }}
                    className={`border rounded-lg p-4 text-center transition-all ${
                      orderSubTab === 'completed' && orderMainTab === 'completed'
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'bg-green-50 border-green-200 hover:bg-green-100'
                    }`}
                  >
                    <div className={`text-2xl font-bold ${orderSubTab === 'completed' && orderMainTab === 'completed' ? 'text-white' : 'text-green-800'}`}>
                      {orders.filter(o => o.status === 'delivered' && o.billingStatus === 'billing_completed').length}
                    </div>
                    <div className={`text-sm ${orderSubTab === 'completed' && orderMainTab === 'completed' ? 'text-white' : 'text-green-600'}`}>Completed Billing</div>
                  </button>
                </div>
              </div>
              
              {/* Date Filter Section */}
              <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 Filter by Date</h3>
                <div className="flex gap-4 items-center">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                    >
                      📅 Today
                    </button>
                    <button
                      onClick={() => {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        setSelectedDate(yesterday.toISOString().split('T')[0]);
                      }}
                      className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                    >
                      Yesterday
                    </button>
                    {selectedDate && (
                      <button
                        onClick={() => setSelectedDate('')}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                      >
                        ✕ Clear
                      </button>
                    )}
                  </div>
                </div>
                {selectedDate && (
                  <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-blue-800 font-medium">
                      Showing orders for: {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Active Orders Section */}
            {orderMainTab === 'active' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Kitchen Orders Section */}
                <div className="bg-white rounded-lg shadow-lg">
                  <div className="bg-pink-50 border-b border-pink-200 px-6 py-4">
                    <h2 className="text-2xl font-bold text-pink-800 flex items-center gap-2">
                      🍽️ Kitchen Orders
                    </h2>
                  </div>
                  <div className="p-6">
                    {(() => {
                      const kitchenOrders = orders.filter(order => {
                        // Apply status filter
                        if (statusFilter !== 'all' && order.status !== statusFilter) {
                          return false;
                        }
                        
                        // Only show non-delivered orders in active section (unless filtering for delivered)
                        if (statusFilter !== 'delivered' && order.status === 'delivered') {
                          return false;
                        }
                        
                        return order.queue === 'Kitchen' || order.queue === 'Both';
                      });
                      
                      return kitchenOrders.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-gray-500 text-lg">
                            {statusFilter === 'all' 
                              ? 'No kitchen orders yet' 
                              : `No ${statusFilter} kitchen orders`
                            }
                          </p>
                          <p className="text-gray-400 text-sm">
                            {statusFilter === 'all' 
                              ? 'Kitchen orders will appear here once placed' 
                              : 'Try selecting a different status or "Show All Orders"'
                            }
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {kitchenOrders.map(order => (
                            <div key={order.id} className="rounded-xl shadow-md p-6 border bg-pink-50 border-pink-200">
                              <div className="flex items-start justify-between mb-4">
                                <div>
                                  <div className="text-2xl font-bold text-gray-900">{order.token}</div>
                                  <div className="text-sm text-gray-500">{order.date} • {order.timestamp}</div>
                                  {order.tableNumber && (
                                    <div className="text-sm font-medium text-blue-600 mt-1">
                                      {order.tableNumber === 'Take Away' ? '📦 Take Away' :
                                       order.tableNumber === 'Home Delivery' ? '🚚 Home Delivery' :
                                       `🏷️ Table: ${order.tableNumber}`}
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => startEditOrder(order)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit Order"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={() => deleteOrder(order.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Cancel Order"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                              
                              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between text-lg py-2">
                                    <span className="text-gray-700">{item.name} × {item.quantity}</span>
                                    <span className="text-gray-900 font-medium">₹{item.price * item.quantity}</span>
                                  </div>
                                ))}
                                <div className="border-t border-gray-300 mt-2 pt-2 flex justify-between font-bold text-xl">
                                  <span>Total</span>
                                  <span>₹{order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)}</span>
                                </div>
                              </div>
                              
                              <div className="flex gap-2">
                                <button
                                  onClick={() => updateOrderStatus(order.id, 'pending')}
                                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    (orderCurrentStatus[order.id] || order.status) === 'pending' 
                                      ? 'bg-yellow-500 text-white' 
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                >
                                  Pending
                                </button>
                                <button
                                  onClick={() => updateOrderStatus(order.id, 'preparing')}
                                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    (orderCurrentStatus[order.id] || order.status) === 'preparing' 
                                      ? 'bg-blue-500 text-white' 
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                >
                                  Preparing
                                </button>
                                <button
                                  onClick={() => updateOrderStatus(order.id, 'ready')}
                                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    (orderCurrentStatus[order.id] || order.status) === 'ready' 
                                      ? 'bg-green-500 text-white' 
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                >
                                  Ready
                                </button>
                                <button
                                  onClick={() => deliverOrder(order.id)}
                                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    (orderCurrentStatus[order.id] || order.status) === 'delivered' 
                                      ? 'bg-purple-500 text-white' 
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                >
                                  Delivered
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Bar Orders Section */}
                <div className="bg-white rounded-lg shadow-lg">
                  <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
                    <h2 className="text-2xl font-bold text-blue-800 flex items-center gap-2">
                      🍹 Cafe/Bar Orders
                    </h2>
                  </div>
                  <div className="p-6">
                    {(() => {
                      const barOrders = orders.filter(order => {
                        // Apply status filter
                        if (statusFilter !== 'all' && order.status !== statusFilter) {
                          return false;
                        }
                        
                        // Only show non-delivered orders in active section (unless filtering for delivered)
                        if (statusFilter !== 'delivered' && order.status === 'delivered') {
                          return false;
                        }
                        
                        return order.queue === 'Bar' || order.queue === 'Both';
                      });
                      
                      return barOrders.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-gray-500 text-lg">
                            {statusFilter === 'all' 
                              ? 'No bar orders yet' 
                              : `No ${statusFilter} bar orders`
                            }
                          </p>
                          <p className="text-gray-400 text-sm">
                            {statusFilter === 'all' 
                              ? 'Bar orders will appear here once placed' 
                              : 'Try selecting a different status or "Show All Orders"'
                            }
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {barOrders.map(order => (
                            <div key={order.id} className="rounded-xl shadow-md p-6 border bg-blue-50 border-blue-200">
                              <div className="flex items-start justify-between mb-4">
                                <div>
                                  <div className="text-2xl font-bold text-gray-900">{order.token}</div>
                                  <div className="text-sm text-gray-500">{order.date} • {order.timestamp}</div>
                                  {order.tableNumber && (
                                    <div className="text-sm font-medium text-blue-600 mt-1">
                                      {order.tableNumber === 'Take Away' ? '📦 Take Away' :
                                       order.tableNumber === 'Home Delivery' ? '🚚 Home Delivery' :
                                       `🏷️ Table: ${order.tableNumber}`}
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => startEditOrder(order)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit Order"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={() => deleteOrder(order.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Cancel Order"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                              
                              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between text-lg py-2">
                                    <span className="text-gray-700">{item.name} × {item.quantity}</span>
                                    <span className="text-gray-900 font-medium">₹{item.price * item.quantity}</span>
                                  </div>
                                ))}
                                <div className="border-t border-gray-300 mt-2 pt-2 flex justify-between font-bold text-xl">
                                  <span>Total</span>
                                  <span>₹{order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)}</span>
                                </div>
                              </div>
                              
                              <div className="flex gap-2">
                                <button
                                  onClick={() => updateOrderStatus(order.id, 'pending')}
                                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    (orderCurrentStatus[order.id] || order.status) === 'pending' 
                                      ? 'bg-yellow-500 text-white' 
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                >
                                  Pending
                                </button>
                                <button
                                  onClick={() => updateOrderStatus(order.id, 'preparing')}
                                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    (orderCurrentStatus[order.id] || order.status) === 'preparing' 
                                      ? 'bg-blue-500 text-white' 
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                >
                                  Preparing
                                </button>
                                <button
                                  onClick={() => updateOrderStatus(order.id, 'ready')}
                                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    (orderCurrentStatus[order.id] || order.status) === 'ready' 
                                      ? 'bg-green-500 text-white' 
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                >
                                  Ready
                                </button>
                                <button
                                  onClick={() => deliverOrder(order.id)}
                                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    (orderCurrentStatus[order.id] || order.status) === 'delivered' 
                                      ? 'bg-purple-500 text-white' 
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                >
                                  Delivered
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Completed Orders Section */}
            {orderMainTab === 'completed' && (
              <div>
                {/* Pending Billing Orders */}
                {orderSubTab === 'pending' && (
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Pending Billing Orders</h2>
                    
                    {(() => {
                      const pendingBillingOrders = orders.filter(order => {
                        if (order.status !== 'delivered') return false;
                        if (!(order.billingStatus === 'pending_billing' || !order.billingStatus)) return false;
                        
                        // Apply date filter if selected
                        if (selectedDate) {
                          const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
                          if (orderDate !== selectedDate) return false;
                        }
                        
                        return true;
                      });
                      
                      return pendingBillingOrders.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-gray-500 text-lg">No pending billing orders</p>
                          <p className="text-gray-400 text-sm">Delivered orders waiting for billing will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                          {pendingBillingOrders.map(order => (
                            <div key={order.id} className={`rounded-xl shadow-md p-6 border ${
                              order.queue === 'Kitchen' || order.queue === 'Both' 
                                ? 'bg-pink-50 border-pink-200' 
                                : 'bg-blue-50 border-blue-200'
                            }`}>
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="text-2xl font-bold text-gray-900">{order.token}</div>
                          <div className="text-sm text-gray-500">{order.date} • {order.timestamp}</div>
                                  {order.tableNumber && (
                                    <div className="text-sm font-medium text-blue-600 mt-1">
                                      🏷️ Table: {order.tableNumber}
                                    </div>
                                  )}
                                  {order.deliveredAt && (
                            <div className="text-xs text-gray-400">
                                      Delivered: {new Date(order.deliveredAt).toLocaleTimeString()}
                            </div>
                          )}
                                  {order.queue && (
                                    <div className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${
                                      order.queue === 'Bar' ? 'bg-blue-100 text-blue-800' :
                                      order.queue === 'Kitchen' ? 'bg-green-100 text-green-800' :
                                      'bg-purple-100 text-purple-800'
                                    }`}>
                                      {order.queue} Queue
                        </div>
                                  )}
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 mb-4">
                        {order.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between text-lg py-2">
                            <span className="text-gray-700">{item.name} × {item.quantity}</span>
                            <span className="text-gray-900 font-medium">₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                                <div className="border-t border-gray-300 mt-2 pt-2 flex justify-between font-bold text-xl">
                          <span>Total</span>
                          <span>₹{order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)}</span>
                        </div>
                      </div>
                      
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <p className="text-gray-900 font-medium text-center mb-3">
                                  Order delivered - Ready for billing completion
                                </p>
                                <button
                                  onClick={() => completeBilling(order.id)}
                                  className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                >
                                  Billing Completed
                                </button>
                      </div>
                    </div>
                    ))}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Completed Billing Orders */}
                {orderSubTab === 'completed' && (
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    {(() => {
                      const completedBillingOrders = orders.filter(order => {
                        if (order.status !== 'delivered') return false;
                        if (order.billingStatus !== 'billing_completed') return false;
                        
                        // Apply date filter if selected
                        if (selectedDate) {
                          const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
                          if (orderDate !== selectedDate) return false;
                        }
                        
                        return true;
                      });
                      
                      const kitchenOrders = completedBillingOrders.filter(order => order.queue === 'Kitchen' || order.queue === 'Both');
                      const barOrders = completedBillingOrders.filter(order => order.queue === 'Bar' || order.queue === 'Both');
                      
                      const kitchenTotal = kitchenOrders.reduce((sum, order) => {
                        return sum + order.items.reduce((orderSum, item) => orderSum + (item.price * item.quantity), 0);
                      }, 0);
                      
                      const barTotal = barOrders.reduce((sum, order) => {
                        return sum + order.items.reduce((orderSum, item) => orderSum + (item.price * item.quantity), 0);
                      }, 0);
                      
                      return (
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900 mb-6">Completed Billing Orders</h2>
                          
                          {completedBillingOrders.length === 0 ? (
                            <div className="text-center py-12">
                              <p className="text-gray-500 text-lg">No completed billing orders yet</p>
                              <p className="text-gray-400 text-sm">Orders with completed billing will appear here</p>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              {/* Kitchen Completed Billing */}
                              {kitchenOrders.length > 0 && (
                                <div>
                                  <div className="bg-gradient-to-r from-pink-50 to-pink-100 border border-pink-200 rounded-lg p-4 mb-4">
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">Completed Kitchen Orders</h3>
                                    <div className="flex justify-between items-center">
                                      <span className="text-lg font-semibold text-gray-700">Total Amount:</span>
                                      <span className="text-2xl font-bold text-pink-600">₹{kitchenTotal}</span>
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    {kitchenOrders.map(order => (
                                      <div key={order.id} className="rounded-xl shadow-md p-6 border bg-pink-50 border-pink-200">
                                        <div className="flex items-start justify-between mb-4">
                                          <div>
                                            <div className="text-2xl font-bold text-gray-900">{order.token}</div>
                                            <div className="text-sm text-gray-500">{order.date} • {order.timestamp}</div>
                                            {order.tableNumber && (
                                              <div className="text-sm font-medium text-blue-600 mt-1">
                                                {order.tableNumber === 'Take Away' ? '📦 Take Away' :
                                                 order.tableNumber === 'Home Delivery' ? '🚚 Home Delivery' :
                                                 `🏷️ Table: ${order.tableNumber}`}
              </div>
            )}
                                            {order.deliveredAt && (
                                              <div className="text-xs text-gray-400">
                                                Delivered: {new Date(order.deliveredAt).toLocaleTimeString()}
          </div>
        )}
                                            {order.billingCompletedAt && (
                                              <div className="text-xs text-gray-400">
                                                Billing Completed: {new Date(order.billingCompletedAt).toLocaleTimeString()}
              </div>
            )}
                                            {order.queue && (
                                              <div className="text-xs px-2 py-1 rounded-full inline-block mt-1 bg-green-100 text-green-800">
                                                {order.queue} Queue
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        
                                        <div className="bg-white rounded-lg p-4 mb-4">
                                          {order.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-lg py-2">
                                              <span className="text-gray-700">{item.name} × {item.quantity}</span>
                                              <span className="text-gray-900 font-medium">₹{item.price * item.quantity}</span>
                                            </div>
                                          ))}
                                          <div className="border-t border-gray-300 mt-2 pt-2 flex justify-between font-bold text-xl">
                                            <span>Total</span>
                                            <span>₹{order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)}</span>
                                          </div>
                                        </div>
                                        
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                          <p className="text-green-800 font-medium text-center">
                                            ✅ Billing Completed
                                          </p>
                  </div>
                </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Bar Completed Billing */}
                              {barOrders.length > 0 && (
                        <div>
                                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4 mb-4">
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">Completed Cafe/Bar Orders</h3>
                                    <div className="flex justify-between items-center">
                                      <span className="text-lg font-semibold text-gray-700">Total Amount:</span>
                                      <span className="text-2xl font-bold text-blue-600">₹{barTotal}</span>
                        </div>
                        </div>
                                  <div className="space-y-3">
                                    {barOrders.map(order => (
                                      <div key={order.id} className="rounded-xl shadow-md p-6 border bg-blue-50 border-blue-200">
                                        <div className="flex items-start justify-between mb-4">
                                          <div>
                                            <div className="text-2xl font-bold text-gray-900">{order.token}</div>
                                            <div className="text-sm text-gray-500">{order.date} • {order.timestamp}</div>
                                            {order.tableNumber && (
                                              <div className="text-sm font-medium text-blue-600 mt-1">
                                                {order.tableNumber === 'Take Away' ? '📦 Take Away' :
                                                 order.tableNumber === 'Home Delivery' ? '🚚 Home Delivery' :
                                                 `🏷️ Table: ${order.tableNumber}`}
                      </div>
                                            )}
                                            {order.deliveredAt && (
                                              <div className="text-xs text-gray-400">
                                                Delivered: {new Date(order.deliveredAt).toLocaleTimeString()}
                          </div>
                                            )}
                                            {order.billingCompletedAt && (
                                              <div className="text-xs text-gray-400">
                                                Billing Completed: {new Date(order.billingCompletedAt).toLocaleTimeString()}
                          </div>
                        )}
                                            {order.queue && (
                                              <div className="text-xs px-2 py-1 rounded-full inline-block mt-1 bg-blue-100 text-blue-800">
                                                {order.queue} Queue
                                              </div>
                                            )}
                                          </div>
                      </div>
                      
                                        <div className="bg-white rounded-lg p-4 mb-4">
                                          {order.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-lg py-2">
                                              <span className="text-gray-700">{item.name} × {item.quantity}</span>
                                              <span className="text-gray-900 font-medium">₹{item.price * item.quantity}</span>
                                            </div>
                                          ))}
                                          <div className="border-t border-gray-300 mt-2 pt-2 flex justify-between font-bold text-xl">
                          <span>Total</span>
                                            <span>₹{order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)}</span>
                        </div>
                      </div>
                                        
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                          <p className="text-green-800 font-medium text-center">
                                            ✅ Billing Completed
                                          </p>
                                        </div>
                    </div>
                  ))}
                                  </div>
                </div>
              )}
            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'takeOrder' && (
          <div className="max-w-6xl mx-auto bg-gradient-to-br from-orange-50 to-yellow-50 min-h-screen p-6 rounded-2xl">
            {editingOrder && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-blue-900 font-medium">Editing Order</p>
                <p className="text-blue-700 text-sm">Modify items and click "Update Order"</p>
              </div>
            )}
            
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
              <div className="border-b border-gray-200">
                <div className="flex">
                  <button
                    onClick={() => setTakeOrderTab('kitchen')}
                    className={`flex-1 px-6 py-3 font-medium transition-all ${
                      takeOrderTab === 'kitchen'
                        ? 'text-pink-600 border-b-2 border-pink-600 bg-pink-50'
                        : 'text-gray-600 hover:text-pink-600 hover:bg-pink-50'
                    }`}
                  >
                    🍽️ Kitchen Items
                  </button>
                  <button
                    onClick={() => setTakeOrderTab('bar')}
                    className={`flex-1 px-6 py-3 font-medium transition-all ${
                      takeOrderTab === 'bar'
                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    🍹 Cafe/Bar Items
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {takeOrderTab === 'kitchen' ? 'Kitchen Items' : 'Cafe/Bar Items'}
                  </h2>
                  {menuItems.length === 0 && (
                    <button
                      onClick={addSampleMenuItems}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Add Sample Items
                    </button>
                  )}
                </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(() => {
                    console.log('=== TAKE ORDER MENU ITEMS DEBUG ===');
                    console.log('All menu items:', menuItems);
                    console.log('Current takeOrderTab:', takeOrderTab);
                    console.log('Filtering for category:', takeOrderTab === 'kitchen' ? 'Kitchen' : 'Cafe/Bar');
                    
                    const filteredItems = menuItems.filter(item => item.category === (takeOrderTab === 'kitchen' ? 'Kitchen' : 'Bar'));
                    console.log('Filtered menu items:', filteredItems);
                    
                    return filteredItems.map(item => {
                      console.log('Rendering menu item:', item);
                      return (
                  <div 
                    key={item.id} 
                    className="border-2 border-gray-200 rounded-xl p-4 hover:border-orange-300 transition-all cursor-pointer"
                    onClick={() => updateCart(item.id, 1)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-semibold text-gray-900 text-lg">{item.name}</div>
                        <div className="text-orange-600 font-medium">₹{item.price}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateCart(item.id, -1);
                        }}
                        className="w-10 h-10 flex items-center justify-center bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        −
                      </button>
                      
                      <div className="text-xl font-bold text-gray-900 min-w-[40px] text-center">
                        {cart[item.id] || 0}
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateCart(item.id, 1);
                        }}
                        className="w-10 h-10 flex items-center justify-center bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                      );
                    });
                  })()}
                </div>
                
                {menuItems.filter(item => item.category === (takeOrderTab === 'kitchen' ? 'Kitchen' : 'Bar')).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-lg">No {takeOrderTab} items available</p>
                    <p className="text-sm mb-4">Add items in Menu Management first</p>
                    {menuItems.length === 0 && (
                      <button
                        onClick={addSampleMenuItems}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                      >
                        Add Sample Menu Items
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {Object.keys(cart).length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h3>
                
                <div className="space-y-2 mb-4">
                  {Object.entries(cart).map(([itemId, qty]) => {
                    const item = menuItems.find(m => m.id === itemId);
                    console.log('Cart summary - looking for item ID:', itemId, 'found:', item);
                    return item ? (
                      <div key={itemId} className="flex justify-between text-gray-700 text-lg">
                        <span>{item.name} × {qty}</span>
                        <span className="font-medium">₹{item.price * qty}</span>
                      </div>
                    ) : (
                      <div key={itemId} className="flex justify-between text-red-500 text-lg">
                        <span>Item not found (ID: {itemId})</span>
                        <span>× {qty}</span>
                      </div>
                    );
                  })}
                </div>
                
                {/* Table Selection */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <label className="block text-lg font-semibold text-gray-700 mb-3">
                    🏷️ Select Table Number
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(tableNum => (
                      <button
                        key={tableNum}
                        onClick={() => setSelectedTable(tableNum.toString())}
                        className={`p-3 rounded-lg font-medium transition-all ${
                          selectedTable === tableNum.toString()
                            ? 'bg-orange-500 text-white shadow-md'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-orange-50 hover:border-orange-300'
                        }`}
                      >
                        {tableNum}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => setSelectedTable('Take Away')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        selectedTable === 'Take Away'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-blue-50 hover:border-blue-300'
                      }`}
                    >
                      📦 Take Away
                    </button>
                    <button
                      onClick={() => setSelectedTable('Home Delivery')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        selectedTable === 'Home Delivery'
                          ? 'bg-green-500 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-green-50 hover:border-green-300'
                      }`}
                    >
                      🚚 Home Delivery
                    </button>
                  </div>
                  {selectedTable && (
                    <div className="mt-3 p-2 bg-orange-100 border border-orange-200 rounded-lg">
                      <span className="text-orange-800 font-medium">
                        Selected: Table {selectedTable}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="border-t border-gray-300 pt-4 mb-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total ({getTotalItems()} items)</span>
                    <span className="text-orange-600">₹{getTotalPrice()}</span>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  {editingOrder ? (
                    <>
                      <button
                        onClick={cancelEdit}
                        className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={updateOrder}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                      >
                        Update Order
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={placeOrder}
                      className="w-full bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Generate Token & Place Order
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="max-w-4xl mx-auto bg-gradient-to-br from-green-50 to-blue-50 min-h-screen p-6 rounded-2xl">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="border-b border-gray-200">
                <div className="flex">
                  <button
                    onClick={() => setMenuTab('kitchen')}
                    className={`flex-1 px-6 py-3 font-medium transition-all ${
                      menuTab === 'kitchen'
                        ? 'text-pink-600 border-b-2 border-pink-600 bg-pink-50'
                        : 'text-gray-600 hover:text-pink-600 hover:bg-pink-50'
                    }`}
                  >
                    🍽️ Kitchen Menu
                  </button>
                  <button
                    onClick={() => setMenuTab('bar')}
                    className={`flex-1 px-6 py-3 font-medium transition-all ${
                      menuTab === 'bar'
                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    🍹 Cafe/Bar Menu
                  </button>
                  </div>
              </div>

              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {menuTab === 'kitchen' ? 'Kitchen Items' : 'Cafe/Bar Items'}
                </h2>
                
                <div className="space-y-3 mb-6">
                <input
                  type="text"
                  placeholder="Item name"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                />
                <input
                  type="number"
                  placeholder="Price"
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        console.log('Button clicked!');
                        addMenuItem();
                      }}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      {editingMenuItem ? 'Update Item' : `+ Add ${menuTab === 'kitchen' ? 'Kitchen' : 'Cafe/Bar'} Item`}
                    </button>
                    {editingMenuItem && (
                    <button
                        onClick={cancelEditMenuItem}
                        className="px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                      >
                        Cancel
                  </button>
                )}
                  </div>
              </div>

              <div className="space-y-2">
                  {(() => {
                    const filteredItems = menuItems.filter(item => item.category === (menuTab === 'kitchen' ? 'Kitchen' : 'Bar'));
                    console.log('Filtering items for tab:', menuTab);
                    console.log('All menuItems:', menuItems);
                    console.log('Filtered items:', filteredItems);
                    return filteredItems;
                  })()
                      .map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div>
                      <div className="font-semibold text-gray-900">{item.name}</div>
                      <div className="text-orange-600 font-medium">₹{item.price}</div>
                        <div className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${
                          item.category === 'Bar' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {item.category}
                        </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditMenuItem(item)}
                        className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                        title="Edit Item"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteMenuItem(item.id)}
                        className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        title="Delete Item"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
                  
                  {menuItems.filter(item => item.category === (menuTab === 'kitchen' ? 'Kitchen' : 'Bar')).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-lg">No {menuTab} items yet</p>
                      <p className="text-sm mb-4">Add some items to get started</p>
                      {menuItems.length === 0 && (
                        <button
                          onClick={addSampleMenuItems}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                        >
                          Add Sample Menu Items
                        </button>
                      )}
              </div>
                  )}
            </div>
          </div>
      </div>
    </div>
        )}
          </div>
        </div>
      );
    }

ReactDOM.render(<QSRBackend />, document.getElementById('root'));