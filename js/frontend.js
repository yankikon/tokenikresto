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
      
      // Filter orders for today only
      const today = new Date().toDateString();
      const todayOrders = userOrders.filter(order => {
        const orderDate = new Date(order.createdAt || order.date).toDateString();
        return orderDate === today;
      });
      
      // Sort by createdAt descending
      todayOrders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      console.log('Loaded today orders:', todayOrders);
      setOrders(todayOrders);
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
      
      // Filter orders for today only
      const today = new Date().toDateString();
      const todayOrders = userOrders.filter(order => {
        const orderDate = new Date(order.createdAt || order.date).toDateString();
        return orderDate === today;
      });
      
      // Sort by createdAt descending
      todayOrders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      console.log('Real-time orders update - today orders:', todayOrders);
      setOrders(todayOrders);
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f1419' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#10b981' }}></div>
          <p style={{ color: '#b3b7c7' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" style={{ background: '#0f1419' }}>
      {/* Header with Logo and Title */}
      <div className="flex items-center justify-center gap-6 mb-8">
        <div className="w-16 h-16 rounded-lg flex items-center justify-center p-2" style={{ background: '#1e2330' }}>
          <img src="./assets/Pikonik Transparent Logo.png" alt="Pikonik Logo" className="w-full h-full object-contain" style={{ filter: 'invert(1) brightness(3) drop-shadow(0 0 8px rgba(255,255,255,0.3))' }} />
        </div>
        <h1 className="text-6xl font-bold" style={{ color: '#e8eaed' }}>
          {boardType === 'kitchen' ? '🍽️ Kitchen' : '🍹 Cafe/Bar'} Order Status Board
        </h1>
      </div>
      
      {/* Board Type Selector */}
      <div className="text-center mb-8">
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setBoardType('kitchen')}
            className="px-6 py-3 rounded-lg font-medium transition-all shadow-lg"
            style={boardType === 'kitchen'
              ? { background: '#ec4899', color: '#ffffff' }
              : { background: '#1a1f2e', color: '#b3b7c7', border: '1px solid #2a3142' }
            }
          >
            🍽️ Kitchen Board
          </button>
          <button
            onClick={() => setBoardType('bar')}
            className="px-6 py-3 rounded-lg font-medium transition-all shadow-lg"
            style={boardType === 'bar'
              ? { background: '#3b82f6', color: '#ffffff' }
              : { background: '#1a1f2e', color: '#b3b7c7', border: '1px solid #2a3142' }
            }
          >
            🍹 Cafe/Bar Board
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Pending Column */}
        <div className="rounded-2xl shadow-lg p-6" style={{ background: '#1a1f2e' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-4 h-4 rounded-full" style={{ background: '#f59e0b' }}></div>
            <h2 className="text-xl font-bold" style={{ color: '#e8eaed' }}>Pending</h2>
            <span className="px-2 py-1 rounded-full text-sm font-medium" style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>
              {getOrdersByStatus('pending').length}
            </span>
          </div>
          <div className="space-y-4">
            {getOrdersByStatus('pending').map(order => (
              <div key={order.id} className="border rounded-xl p-4" style={{
                background: 'rgba(245,158,11,0.1)',
                borderColor: '#f59e0b'
              }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-2xl font-bold" style={{ color: '#e8eaed' }}>{order.token}</div>
                  {order.tableNumber && (
                    <div className="text-xs font-medium" style={{ color: '#f59e0b' }}>
                      {order.tableNumber === 'Take Away' ? '📦 Take Away' :
                       order.tableNumber === 'Home Delivery' ? '🚚 Home Delivery' :
                       `🏷️ Table ${order.tableNumber}`}
                    </div>
                  )}
                  <div className="text-xl" style={{ color: '#f59e0b' }}>⏰</div>
                </div>
                <div className="space-y-1">
                  {order.items.slice(0, 2).map((item, idx) => (
                    <div key={idx} className="text-sm" style={{ color: '#b3b7c7' }}>
                      {item.name} × {item.quantity}
                    </div>
                  ))}
                  {order.items.length > 2 && (
                    <div className="text-xs" style={{ color: '#6b7280' }}>
                      +{order.items.length - 2} more items
                    </div>
                  )}
                </div>
              </div>
            ))}
            {getOrdersByStatus('pending').length === 0 && (
              <div className="text-center py-8" style={{ color: '#6b7280' }}>
                <div className="text-4xl mb-2">⏰</div>
                <p className="text-sm">No pending {boardType} orders</p>
              </div>
            )}
          </div>
        </div>

        {/* Preparing Column */}
        <div className="rounded-2xl shadow-lg p-6" style={{ background: '#1a1f2e' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-4 h-4 rounded-full" style={{ background: '#3b82f6' }}></div>
            <h2 className="text-xl font-bold" style={{ color: '#e8eaed' }}>Preparing</h2>
            <span className="px-2 py-1 rounded-full text-sm font-medium" style={{ background: 'rgba(59,130,246,0.2)', color: '#3b82f6' }}>
              {getOrdersByStatus('preparing').length}
            </span>
          </div>
          <div className="space-y-4">
            {getOrdersByStatus('preparing').map(order => (
              <div key={order.id} className="border rounded-xl p-4" style={{
                background: 'rgba(59,130,246,0.1)',
                borderColor: '#3b82f6'
              }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-2xl font-bold" style={{ color: '#e8eaed' }}>{order.token}</div>
                  {order.tableNumber && (
                    <div className="text-xs font-medium" style={{ color: '#3b82f6' }}>
                      {order.tableNumber === 'Take Away' ? '📦 Take Away' :
                       order.tableNumber === 'Home Delivery' ? '🚚 Home Delivery' :
                       `🏷️ Table ${order.tableNumber}`}
                    </div>
                  )}
                  <div className="text-xl" style={{ color: '#3b82f6' }}>👨‍🍳</div>
                </div>
                <div className="space-y-1">
                  {order.items.slice(0, 2).map((item, idx) => (
                    <div key={idx} className="text-sm" style={{ color: '#b3b7c7' }}>
                      {item.name} × {item.quantity}
                    </div>
                  ))}
                  {order.items.length > 2 && (
                    <div className="text-xs" style={{ color: '#6b7280' }}>
                      +{order.items.length - 2} more items
                    </div>
                  )}
                </div>
              </div>
            ))}
            {getOrdersByStatus('preparing').length === 0 && (
              <div className="text-center py-8" style={{ color: '#6b7280' }}>
                <div className="text-4xl mb-2">👨‍🍳</div>
                <p className="text-sm">No {boardType} orders preparing</p>
              </div>
            )}
          </div>
        </div>

        {/* Ready Column */}
        <div className="rounded-2xl shadow-lg p-6" style={{ background: '#1a1f2e' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-4 h-4 rounded-full" style={{ background: '#10b981' }}></div>
            <h2 className="text-xl font-bold" style={{ color: '#e8eaed' }}>Ready</h2>
            <span className="px-2 py-1 rounded-full text-sm font-medium" style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981' }}>
              {getOrdersByStatus('ready').length}
            </span>
          </div>
          <div className="space-y-4">
            {getOrdersByStatus('ready').map(order => (
              <div key={order.id} className="border rounded-xl p-4" style={{
                background: 'rgba(16,185,129,0.1)',
                borderColor: '#10b981'
              }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-2xl font-bold" style={{ color: '#e8eaed' }}>{order.token}</div>
                  {order.tableNumber && (
                    <div className="text-xs font-medium" style={{ color: '#10b981' }}>
                      {order.tableNumber === 'Take Away' ? '📦 Take Away' :
                       order.tableNumber === 'Home Delivery' ? '🚚 Home Delivery' :
                       `🏷️ Table ${order.tableNumber}`}
                    </div>
                  )}
                  <div className="text-xl" style={{ color: '#10b981' }}>✅</div>
                </div>
                <div className="space-y-1">
                  {order.items.slice(0, 2).map((item, idx) => (
                    <div key={idx} className="text-sm" style={{ color: '#b3b7c7' }}>
                      {item.name} × {item.quantity}
                    </div>
                  ))}
                  {order.items.length > 2 && (
                    <div className="text-xs" style={{ color: '#6b7280' }}>
                      +{order.items.length - 2} more items
                    </div>
                  )}
                </div>
              </div>
            ))}
            {getOrdersByStatus('ready').length === 0 && (
              <div className="text-center py-8" style={{ color: '#6b7280' }}>
                <div className="text-4xl mb-2">✅</div>
                <p className="text-sm">No {boardType} orders ready</p>
              </div>
            )}
          </div>
        </div>

        {/* Delivered Column */}
        <div className="rounded-2xl shadow-lg p-6" style={{ background: '#1a1f2e' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-4 h-4 rounded-full" style={{ background: '#8b5cf6' }}></div>
            <h2 className="text-xl font-bold" style={{ color: '#e8eaed' }}>Delivered</h2>
            <span className="px-2 py-1 rounded-full text-sm font-medium" style={{ background: 'rgba(139,92,246,0.2)', color: '#8b5cf6' }}>
              {getOrdersByStatus('delivered').length}
            </span>
          </div>
          <div className="space-y-4">
            {getOrdersByStatus('delivered').map(order => (
              <div key={order.id} className="border rounded-xl p-4" style={{
                background: 'rgba(139,92,246,0.1)',
                borderColor: '#8b5cf6'
              }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-2xl font-bold" style={{ color: '#e8eaed' }}>{order.token}</div>
                  {order.tableNumber && (
                    <div className="text-xs font-medium" style={{ color: '#8b5cf6' }}>
                      {order.tableNumber === 'Take Away' ? '📦 Take Away' :
                       order.tableNumber === 'Home Delivery' ? '🚚 Home Delivery' :
                       `🏷️ Table ${order.tableNumber}`}
                    </div>
                  )}
                  <div className="text-xl" style={{ color: '#8b5cf6' }}>🎉</div>
                </div>
                <div className="space-y-1">
                  {order.items.slice(0, 2).map((item, idx) => (
                    <div key={idx} className="text-sm" style={{ color: '#b3b7c7' }}>
                      {item.name} × {item.quantity}
                    </div>
                  ))}
                  {order.items.length > 2 && (
                    <div className="text-xs" style={{ color: '#6b7280' }}>
                      +{order.items.length - 2} more items
                    </div>
                  )}
                </div>
                {order.deliveredAt && (
                  <div className="text-xs mt-2" style={{ color: '#8b5cf6' }}>
                    Delivered: {new Date(order.deliveredAt).toLocaleTimeString()}
                  </div>
                )}
              </div>
            ))}
            {getOrdersByStatus('delivered').length === 0 && (
              <div className="text-center py-8" style={{ color: '#6b7280' }}>
                <div className="text-4xl mb-2">🎉</div>
                <p className="text-sm">No delivered {boardType} orders</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-8 right-8 flex items-center gap-3 px-6 py-3 rounded-full shadow-lg" style={{ background: '#1a1f2e' }}>
        <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: '#10b981' }}></div>
        <span className="font-medium" style={{ color: '#e8eaed' }}>Live Updates</span>
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