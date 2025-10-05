const { useState, useEffect } = React;

function QSRTVDisplay() {
  const [orders, setOrders] = useState([]);
  const [boardType, setBoardType] = useState('kitchen'); // 'kitchen' or 'bar'
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Authentication effect
  useEffect(() => {
    const initializeAuth = () => {
      if (!window.Firebase || !window.firebaseAuth || !window.firebaseReady) {
        console.log('Waiting for Firebase to load...');
        setTimeout(initializeAuth, 100);
        return;
      }

      console.log('Firebase loaded, initializing auth...');
      const unsubscribe = window.Firebase.onAuthStateChanged(window.firebaseAuth, async (user) => {
        if (user) {
          console.log('User authenticated:', user.email);
          setUser(user);
          // Real-time listener will handle loading orders
        } else {
          console.log('No user authenticated, redirecting to index');
          setUser(null);
          window.location.href = 'index.html';
        }
        setLoading(false);
      });

      return () => unsubscribe();
    };

    const cleanup = initializeAuth();
    return cleanup;
  }, []);

  // Load user-specific orders from Firestore
  const loadUserOrders = async (userId) => {
    try {
      if (!window.Firebase || !window.firebaseDb) {
        console.error('Firebase not loaded yet');
        return;
      }
      
      console.log('Loading orders for user:', userId);
      const ordersRef = window.Firebase.collection(window.firebaseDb, 'users', userId, 'orders');
      const ordersSnapshot = await window.Firebase.getDocs(ordersRef);
      const userOrders = [];
      
      console.log('Orders snapshot size:', ordersSnapshot.size);
      ordersSnapshot.forEach((doc) => {
        const orderData = doc.data();
        console.log('Order data:', orderData);
        if (!orderData.deleted) {
          userOrders.push({ id: doc.id, ...orderData });
        }
      });
      
      // Sort by createdAt descending
      userOrders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      console.log('Loaded orders:', userOrders);
      setOrders(userOrders);
    } catch (error) {
      console.error('Error loading user orders:', error);
      setOrders([]);
    }
  };

  useEffect(() => {
    if (!user || !window.Firebase || !window.firebaseDb) {
      console.log('Real-time listener setup skipped:', { user: !!user, Firebase: !!window.Firebase, firebaseDb: !!window.firebaseDb });
      return;
    }
    
    console.log('Setting up real-time listener for user:', user.uid);
    console.log('Firebase instances:', { Firebase: !!window.Firebase, firebaseDb: !!window.firebaseDb, onSnapshot: !!window.Firebase.onSnapshot });
    
    const ordersRef = window.Firebase.collection(window.firebaseDb, 'users', user.uid, 'orders');
    console.log('Orders reference created:', ordersRef);
    
    // Set up real-time listener
    const unsubscribe = window.Firebase.onSnapshot(ordersRef, (snapshot) => {
      console.log('Real-time snapshot received, size:', snapshot.size);
      const userOrders = [];
      snapshot.forEach((doc) => {
        const orderData = doc.data();
        console.log('Processing order:', doc.id, orderData);
        if (!orderData.deleted) {
          userOrders.push({ id: doc.id, ...orderData });
        }
      });
      
      // Sort by createdAt descending
      userOrders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      console.log('Real-time orders update - final orders:', userOrders);
      setOrders(userOrders);
    }, (error) => {
      console.error('Error in real-time listener:', error);
    });

    return () => {
      console.log('Cleaning up real-time listener');
      unsubscribe();
    };
  }, [user]);

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return 'bg-yellow-500';
      case 'preparing': return 'bg-blue-500';
      case 'ready': return 'bg-green-500';
      case 'delivered': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'pending': return '⏰';
      case 'preparing': return '👨‍🍳';
      case 'ready': return '✅';
      case 'delivered': return '🎉';
      default: return null;
    }
  };

  const getStatusText = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getOrdersByStatus = (status) => {
    return orders.filter(order => {
      if (order.status !== status) return false;
      
      // Filter by board type (kitchen or bar)
      if (boardType === 'kitchen') {
        return order.queue === 'Kitchen' || order.queue === 'Both';
      } else {
        return order.queue === 'Bar' || order.queue === 'Both';
      }
    });
  };

  // Debug function to test connection
  const testConnection = async () => {
    console.log('Testing connection...');
    console.log('User:', user);
    console.log('Firebase instances:', { Firebase: !!window.Firebase, firebaseDb: !!window.firebaseDb });
    console.log('Current orders:', orders);
    
    if (user && window.Firebase && window.firebaseDb) {
      try {
        const ordersRef = window.Firebase.collection(window.firebaseDb, 'users', user.uid, 'orders');
        const snapshot = await window.Firebase.getDocs(ordersRef);
        console.log('Direct Firestore query result:', snapshot.size, 'orders');
        snapshot.forEach(doc => {
          console.log('Order from direct query:', doc.id, doc.data());
        });
      } catch (error) {
        console.error('Error in direct query:', error);
      }
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50 p-8">
      {/* Header with Pikonik Logo */}
      <div className="flex justify-center mb-8">
        <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center p-2">
          <img src="./assets/Pikonik Transparent Logo.png" alt="Pikonik Logo" className="w-full h-full object-contain" />
        </div>
      </div>
      
      <div className="text-center mb-8">
        <h1 className="text-6xl font-bold text-gray-900 mb-3">
          {boardType === 'kitchen' ? '🍽️ Kitchen' : '🍹 Cafe/Bar'} Order Status Board
        </h1>
        
        {/* Board Type Selector */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setBoardType('kitchen')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              boardType === 'kitchen'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            🍽️ Kitchen Board
          </button>
          <button
            onClick={() => setBoardType('bar')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              boardType === 'bar'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            🍹 Cafe/Bar Board
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Pending Column */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
            <h2 className="text-xl font-bold text-gray-900">Pending</h2>
            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm font-medium">
              {getOrdersByStatus('pending').length}
            </span>
          </div>
          <div className="space-y-4">
            {getOrdersByStatus('pending').map(order => (
              <div key={order.id} className={`border rounded-xl p-4 ${
                order.queue === 'Kitchen' || order.queue === 'Both' 
                  ? 'bg-yellow-100 border-yellow-300' 
                  : 'bg-yellow-100 border-yellow-300'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-2xl font-bold text-gray-900">{order.token}</div>
                  {order.tableNumber && (
                    <div className="text-xs font-medium text-blue-600">
                      {order.tableNumber === 'Take Away' ? '📦 Take Away' :
                       order.tableNumber === 'Home Delivery' ? '🚚 Home Delivery' :
                       `🏷️ Table ${order.tableNumber}`}
                    </div>
                  )}
                  <div className="text-yellow-600 text-xl">⏰</div>
                </div>
                <div className="space-y-1">
                  {order.items.slice(0, 2).map((item, idx) => (
                    <div key={idx} className="text-sm text-gray-600">
                      {item.name} × {item.quantity}
                    </div>
                  ))}
                  {order.items.length > 2 && (
                    <div className="text-xs text-gray-500">
                      +{order.items.length - 2} more items
                    </div>
                  )}
                </div>
              </div>
            ))}
            {getOrdersByStatus('pending').length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <div className="text-4xl mb-2">⏰</div>
                <p className="text-sm">No pending {boardType} orders</p>
              </div>
            )}
          </div>
        </div>

        {/* Preparing Column */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            <h2 className="text-xl font-bold text-gray-900">Preparing</h2>
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
              {getOrdersByStatus('preparing').length}
            </span>
          </div>
          <div className="space-y-4">
            {getOrdersByStatus('preparing').map(order => (
              <div key={order.id} className={`border rounded-xl p-4 ${
                order.queue === 'Kitchen' || order.queue === 'Both' 
                  ? 'bg-blue-100 border-blue-300' 
                  : 'bg-blue-100 border-blue-300'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-2xl font-bold text-gray-900">{order.token}</div>
                  {order.tableNumber && (
                    <div className="text-xs font-medium text-blue-600">
                      {order.tableNumber === 'Take Away' ? '📦 Take Away' :
                       order.tableNumber === 'Home Delivery' ? '🚚 Home Delivery' :
                       `🏷️ Table ${order.tableNumber}`}
                    </div>
                  )}
                  <div className="text-blue-600 text-xl">👨‍🍳</div>
                </div>
                <div className="space-y-1">
                  {order.items.slice(0, 2).map((item, idx) => (
                    <div key={idx} className="text-sm text-gray-600">
                      {item.name} × {item.quantity}
                    </div>
                  ))}
                  {order.items.length > 2 && (
                    <div className="text-xs text-gray-500">
                      +{order.items.length - 2} more items
                    </div>
                  )}
                </div>
              </div>
            ))}
            {getOrdersByStatus('preparing').length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <div className="text-4xl mb-2">👨‍🍳</div>
                <p className="text-sm">No {boardType} orders preparing</p>
              </div>
            )}
          </div>
        </div>

        {/* Ready Column */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <h2 className="text-xl font-bold text-gray-900">Ready</h2>
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
              {getOrdersByStatus('ready').length}
            </span>
          </div>
          <div className="space-y-4">
            {getOrdersByStatus('ready').map(order => (
              <div key={order.id} className={`border rounded-xl p-4 ${
                order.queue === 'Kitchen' || order.queue === 'Both' 
                  ? 'bg-green-100 border-green-300' 
                  : 'bg-green-100 border-green-300'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-2xl font-bold text-gray-900">{order.token}</div>
                  {order.tableNumber && (
                    <div className="text-xs font-medium text-blue-600">
                      {order.tableNumber === 'Take Away' ? '📦 Take Away' :
                       order.tableNumber === 'Home Delivery' ? '🚚 Home Delivery' :
                       `🏷️ Table ${order.tableNumber}`}
                    </div>
                  )}
                  <div className="text-green-600 text-xl">✅</div>
                </div>
                <div className="space-y-1">
                  {order.items.slice(0, 2).map((item, idx) => (
                    <div key={idx} className="text-sm text-gray-600">
                      {item.name} × {item.quantity}
                    </div>
                  ))}
                  {order.items.length > 2 && (
                    <div className="text-xs text-gray-500">
                      +{order.items.length - 2} more items
                    </div>
                  )}
                </div>
              </div>
            ))}
            {getOrdersByStatus('ready').length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <div className="text-4xl mb-2">✅</div>
                <p className="text-sm">No {boardType} orders ready</p>
              </div>
            )}
          </div>
        </div>

        {/* Delivered Column */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
            <h2 className="text-xl font-bold text-gray-900">Delivered</h2>
            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm font-medium">
              {getOrdersByStatus('delivered').length}
            </span>
          </div>
          <div className="space-y-4">
            {getOrdersByStatus('delivered').map(order => (
              <div key={order.id} className={`border rounded-xl p-4 ${
                order.queue === 'Kitchen' || order.queue === 'Both' 
                  ? 'bg-purple-100 border-purple-300' 
                  : 'bg-purple-100 border-purple-300'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-2xl font-bold text-gray-900">{order.token}</div>
                  {order.tableNumber && (
                    <div className="text-xs font-medium text-blue-600">
                      {order.tableNumber === 'Take Away' ? '📦 Take Away' :
                       order.tableNumber === 'Home Delivery' ? '🚚 Home Delivery' :
                       `🏷️ Table ${order.tableNumber}`}
                    </div>
                  )}
                  <div className="text-purple-600 text-xl">🎉</div>
                </div>
                <div className="space-y-1">
                  {order.items.slice(0, 2).map((item, idx) => (
                    <div key={idx} className="text-sm text-gray-600">
                      {item.name} × {item.quantity}
                    </div>
                  ))}
                  {order.items.length > 2 && (
                    <div className="text-xs text-gray-500">
                      +{order.items.length - 2} more items
                    </div>
                  )}
                </div>
                {order.deliveredAt && (
                  <div className="text-xs text-purple-600 mt-2">
                    Delivered: {new Date(order.deliveredAt).toLocaleTimeString()}
                  </div>
                )}
              </div>
            ))}
            {getOrdersByStatus('delivered').length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <div className="text-4xl mb-2">🎉</div>
                <p className="text-sm">No delivered {boardType} orders</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-8 right-8 flex items-center gap-3 bg-white px-6 py-3 rounded-full shadow-lg">
        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-gray-700 font-medium">Live Updates</span>
      </div>
    </div>
  );
}

// Use React 18 createRoot instead of ReactDOM.render
// Wait for Firebase to load before rendering
const renderApp = () => {
  if (window.Firebase && window.firebaseAuth && window.firebaseReady) {
    console.log('Firebase ready, rendering React app...');
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<QSRTVDisplay />);
  } else {
    console.log('Waiting for Firebase to be ready...');
    // Retry after a short delay
    setTimeout(renderApp, 100);
  }
};

// Start rendering when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp);
} else {
  renderApp();
}