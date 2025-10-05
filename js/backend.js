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

  // Update menu items effect - disabled automatic saving to prevent conflicts
  // useEffect(() => {
  //   if (user && menuItems.length > 0) {
  //     saveMenuItemsToFirestore(menuItems);
  //   }
  // }, [menuItems, user]);

  const generateToken = (queue) => {
    let counterKey = 'kitchen';
    if (queue === 'Bar') {
      counterKey = 'bar';
    } else if (queue === 'Both') {
      // For mixed orders, default to Kitchen
      counterKey = 'kitchen';
    }
    
    setOrderCounters(prev => {
      const newCounters = { ...prev };
      newCounters[counterKey] = newCounters[counterKey] + 1;
      return newCounters;
    });
    
    const counter = orderCounters[counterKey] + 1;
    const paddedNumber = counter.toString().padStart(4, '0');
    
    if (queue === 'Kitchen' || queue === 'Both') {
      return `K-${paddedNumber}`;
    } else if (queue === 'Bar') {
      return `B-${paddedNumber}`;
    }
    return `T-${paddedNumber}`; // fallback
  };

  const addMenuItem = () => {
    console.log('Adding menu item:', newItem);
    if (newItem.name && newItem.price ) {
      if (editingMenuItem) {
        updateMenuItem();
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
        console.log('Adding menu item:', newMenuItem);
        console.log('Current menuTab:', menuTab);
        console.log('Current menuItems:', menuItems);
        setMenuItems([...menuItems, newMenuItem]);
        setNewItem({ name: '', price: '' , category: '' });
      }
    } else {
      console.log('Validation failed:', { name: newItem.name, price: newItem.price });
    }
  };

  const deleteMenuItem = (id) => {
    setMenuItems(menuItems.filter(item => item.id !== id));
  };

  const startEditMenuItem = (item) => {
    setEditingMenuItem(item.id);
    setNewItem({ name: item.name, price: item.price.toString(), category: item.category });
  };

  const updateMenuItem = () => {
    if (newItem.name && newItem.price) {
      const category = menuTab === 'kitchen' ? 'Kitchen' : 'Bar';
      setMenuItems(menuItems.map(item => 
        item.id === editingMenuItem 
          ? { ...item, name: newItem.name, price: parseFloat(newItem.price), category: category }
          : item
      ));
      setNewItem({ name: '', price: '', category: '' });
      setEditingMenuItem(null);
    }
  };

  const cancelEditMenuItem = () => {
    setNewItem({ name: '', price: '', category: '' });
    setEditingMenuItem(null);
  };

  const updateCart = (itemId, change) => {
    setCart(prev => {
      const newCart = { ...prev };
      const currentQty = newCart[itemId] || 0;
      const newQty = currentQty + change;
      
      if (newQty <= 0) {
        delete newCart[itemId];
      } else {
        newCart[itemId] = newQty;
      }
      return newCart;
    });
  };

  const placeOrder = async () => {
    if (Object.keys(cart).length === 0 || !user) return;
    
    const orderItems = Object.entries(cart).map(([itemId, qty]) => {
      const item = menuItems.find(m => m.id === parseInt(itemId));
      return { ...item, quantity: qty };
    });

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
    const cleanOrderItems = orderItems.map(item => ({
      id: item.id,
      name: item.name,
      price: typeof item.price === 'number' ? item.price : parseFloat(item.price),
      category: item.category,
      quantity: typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity)
    }));
    
    const newOrder = {
      id: orderId,
      token: generateToken(queue),
      items: cleanOrderItems,
      status: 'pending',
      queue: queue,
      timestamp: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString(),
      userId: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Save to Firestore
    try {
      console.log('Attempting to save order to Firestore:', newOrder);
      const ordersRef = window.Firebase.collection(db, 'users', user.uid, 'orders');
      const orderDoc = window.Firebase.doc(ordersRef, orderId);
      
      await window.Firebase.setDoc(orderDoc, newOrder);
      console.log('Order saved successfully to Firestore');
      
      // Update local state
      setOrders([newOrder, ...orders]);
      setCart({});
    } catch (error) {
      console.error('Error saving order to Firestore:', error);
      console.error('Error details:', error.message);
      console.error('Error code:', error.code);
      
      // Fallback to local state
      setOrders([newOrder, ...orders]);
      setCart({});
      
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
      window.location.href = 'login.html';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const updateOrderStatus = (orderId, newStatus) => {
    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
    
    // Track current status for this order
    setOrderCurrentStatus(prev => ({
      ...prev,
      [orderId]: newStatus
    }));
  };

  const deliverOrder = (orderId) => {
    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, status: 'delivered', deliveredAt: new Date().toISOString(), billingStatus: 'pending_billing' } : order
    ));
    
    // Track current status for this order
    setOrderCurrentStatus(prev => ({
      ...prev,
      [orderId]: 'delivered'
    }));
  };

  const completeBilling = (orderId) => {
    if (confirm('Are you sure you have completed this billing on pikonik?')) {
      setOrders(orders.filter(order => order.id !== orderId));
    }
  };

  const deleteOrder = (orderId) => {
    if (confirm('Are you sure you want to cancel this order?')) {
      setOrders(orders.filter(order => order.id !== orderId));
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
    
    const orderItems = Object.entries(cart).map(([itemId, qty]) => {
      const item = menuItems.find(m => m.id === parseInt(itemId));
      return { ...item, quantity: qty };
    });

    setOrders(orders.map(order => 
      order.id === editingOrder 
        ? { ...order, items: orderItems }
        : order
    ));
    
    setCart({});
    setEditingOrder(null);
    setActiveTab('orders');
  };

  const cancelEdit = () => {
    setCart({});
    setEditingOrder(null);
    setActiveTab('orders');
  };

  const getTotalItems = () => {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  };

  const getTotalPrice = () => {
    return Object.entries(cart).reduce((sum, [itemId, qty]) => {
      const item = menuItems.find(m => m.id === parseInt(itemId));
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
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
              <p className="text-sm text-gray-500">TOKENIK (RESTAURANT TOKEN APP)</p>
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
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-800">
                      {orders.filter(o => o.status === 'delivered' && o.billingStatus === 'pending_billing').length}
                    </div>
                    <div className="text-sm text-yellow-600">Pending Billing</div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-800">
                      {orders.filter(o => o.status === 'delivered' && o.billingStatus !== 'pending_billing').length}
                    </div>
                    <div className="text-sm text-green-600">Completed Billing</div>
                  </div>
                </div>
              </div>
            )}

            {/* Active Orders Section */}
            {orderMainTab === 'active' && (
              <div>
                <div className="bg-white border-b border-gray-200">
                  <div className="flex">
                    <button
                      onClick={() => setOrderSubTab('kitchen')}
                      className={`flex-1 px-6 py-3 font-medium transition-all ${
                        orderSubTab === 'kitchen'
                          ? 'text-pink-600 border-b-2 border-pink-600 bg-pink-50'
                          : 'text-gray-600 hover:text-pink-600 hover:bg-pink-50'
                      }`}
                    >
                      🍽️ Kitchen Orders
                    </button>
                    <button
                      onClick={() => setOrderSubTab('bar')}
                      className={`flex-1 px-6 py-3 font-medium transition-all ${
                        orderSubTab === 'bar'
                          ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                          : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      🍹 Bar Orders
                    </button>
                  </div>
                </div>

            <div className="bg-white rounded-b-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {orderSubTab === 'kitchen' ? 'Kitchen Orders' : 'Bar Orders'}
              </h2>
              
              {(() => {
                const filteredOrders = orders.filter(order => {
                  // Apply status filter
                  if (statusFilter !== 'all' && order.status !== statusFilter) {
                    return false;
                  }
                  
                  // Only show non-delivered orders in active section (unless filtering for delivered)
                  if (statusFilter !== 'delivered' && order.status === 'delivered') {
                    return false;
                  }
                  
                  if (orderSubTab === 'kitchen') {
                    return order.queue === 'Kitchen' || order.queue === 'Both';
                  } else {
                    return order.queue === 'Bar' || order.queue === 'Both';
                  }
                });
                
                return filteredOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">
                      {statusFilter === 'all' 
                        ? `No ${orderSubTab} orders yet` 
                        : `No ${statusFilter} ${orderSubTab} orders`
                      }
                    </p>
                    <p className="text-gray-400 text-sm">
                      {statusFilter === 'all' 
                        ? 'Orders will appear here once placed' 
                        : 'Try selecting a different status or "Show All Orders"'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredOrders.map(order => (
                  <div key={order.id} className={`rounded-xl shadow-md p-6 border ${
                    order.queue === 'Kitchen' || order.queue === 'Both' 
                      ? 'bg-pink-50 border-pink-200' 
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="text-2xl font-bold text-gray-900">{order.token}</div>
                        <div className="text-sm text-gray-500">{order.date} • {order.timestamp}</div>
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
            )}

            {/* Completed Orders Section */}
            {orderMainTab === 'completed' && (
              <div>
                <div className="bg-white border-b border-gray-200">
                  <div className="flex">
                    <button
                      onClick={() => setOrderSubTab('kitchen')}
                      className={`flex-1 px-6 py-3 font-medium transition-all ${
                        orderSubTab === 'kitchen'
                          ? 'text-pink-600 border-b-2 border-pink-600 bg-pink-50'
                          : 'text-gray-600 hover:text-pink-600 hover:bg-pink-50'
                      }`}
                    >
                      🍽️ Kitchen Orders
                    </button>
                    <button
                      onClick={() => setOrderSubTab('bar')}
                      className={`flex-1 px-6 py-3 font-medium transition-all ${
                        orderSubTab === 'bar'
                          ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                          : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      🍹 Bar Orders
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-b-lg shadow-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    {orderSubTab === 'kitchen' ? 'Completed Kitchen Orders' : 'Completed Bar Orders'}
                  </h2>
                  
                  {(() => {
                    const completedOrders = orders.filter(order => {
                      if (order.status !== 'delivered') return false;
                      
                      if (orderSubTab === 'kitchen') {
                        return order.queue === 'Kitchen' || order.queue === 'Both';
                      } else {
                        return order.queue === 'Bar' || order.queue === 'Both';
                      }
                    });
                    
                    return completedOrders.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-gray-500 text-lg">No completed {orderSubTab} orders yet</p>
                        <p className="text-gray-400 text-sm">Delivered orders will appear here</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {completedOrders.map(order => (
                          <div key={order.id} className={`rounded-xl shadow-md p-6 border ${
                            order.queue === 'Kitchen' || order.queue === 'Both' 
                              ? 'bg-pink-50 border-pink-200' 
                              : 'bg-blue-50 border-blue-200'
                          }`}>
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <div className="text-2xl font-bold text-gray-900">{order.token}</div>
                                <div className="text-sm text-gray-500">{order.date} • {order.timestamp}</div>
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
                    🍹 Bar Items
                  </button>
                </div>
              </div>

              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {takeOrderTab === 'kitchen' ? 'Kitchen Items' : 'Bar Items'}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {menuItems
                    .filter(item => item.category === (takeOrderTab === 'kitchen' ? 'Kitchen' : 'Bar'))
                    .map(item => (
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
                  ))}
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
                    const item = menuItems.find(m => m.id === parseInt(itemId));
                    return item ? (
                      <div key={itemId} className="flex justify-between text-gray-700 text-lg">
                        <span>{item.name} × {qty}</span>
                        <span className="font-medium">₹{item.price * qty}</span>
                      </div>
                    ) : null;
                  })}
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
                    🍹 Bar Menu
                  </button>
                </div>
              </div>

              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {menuTab === 'kitchen' ? 'Kitchen Items' : 'Bar Items'}
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
                      {editingMenuItem ? 'Update Item' : `+ Add ${menuTab === 'kitchen' ? 'Kitchen' : 'Bar'} Item`}
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