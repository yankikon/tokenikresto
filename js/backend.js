const { useState, useEffect } = React;


function QSRBackend() {
  const [activeTab, setActiveTab] = useState('orders');
  const [orderSubTab, setOrderSubTab] = useState('active');
  const [error, setError] = useState(null);
  const [menuItems, setMenuItems] = useState([
    { id: 1, name: 'Masala Dosa', price: 80, category: 'Kitchen' },
    { id: 2, name: 'Idli Sambhar', price: 60, category: 'Kitchen' },
    { id: 3, name: 'Filter Coffee', price: 40, category: 'Bar' },
    { id: 4, name: 'Vada', price: 50, category: 'Kitchen' }
  ]);
  const [orders, setOrders] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', price: '', category: 'Kitchen' });
  const [cart, setCart] = useState({});
  const [cityIndex, setCityIndex] = useState(0);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editingMenuItem, setEditingMenuItem] = useState(null);

  useEffect(() => {
    const savedOrders = JSON.parse(localStorage.getItem('qsrOrders') || '[]');
    setOrders(savedOrders);
  }, []);

  useEffect(() => {
    localStorage.setItem('qsrOrders', JSON.stringify(orders));
  }, [orders]);

  const generateToken = () => {
    const number = Math.floor(Math.random() * 999) + 1;
    return `T-${number}`;
  };

  const addMenuItem = () => {
    if (newItem.name && newItem.price && newItem.category) {
      const price = parseFloat(newItem.price);
      if (!isNaN(price) && price > 0) {
        setMenuItems([...menuItems, {
          id: Date.now(),
          name: newItem.name.trim(),
          price: price,
          category: newItem.category
        }]);
        setNewItem({ name: '', price: '', category: 'Kitchen' });
      }
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
    if (newItem.name && newItem.price && newItem.category && editingMenuItem) {
      const price = parseFloat(newItem.price);
      if (!isNaN(price) && price > 0) {
        setMenuItems(menuItems.map(item => 
          item.id === editingMenuItem 
            ? { ...item, name: newItem.name.trim(), price: price, category: newItem.category }
            : item
        ));
        setNewItem({ name: '', price: '', category: 'Kitchen' });
        setEditingMenuItem(null);
      }
    }
  };

  const cancelEditMenuItem = () => {
    setNewItem({ name: '', price: '', category: 'Kitchen' });
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

  const placeOrder = () => {
    if (Object.keys(cart).length === 0) return;
    
    const orderItems = Object.entries(cart).map(([itemId, qty]) => {
      const item = menuItems.find(m => m.id === parseInt(itemId));
      if (item) {
        return { ...item, quantity: qty };
      }
      return null;
    }).filter(Boolean);

    if (orderItems.length === 0) return;

    // Determine if order contains Bar items
    const hasBarItems = orderItems.some(item => item.category === 'Bar');
    const hasKitchenItems = orderItems.some(item => item.category === 'Kitchen');
    
    // Route to appropriate queue
    let queue = 'Kitchen'; // Default to Kitchen
    if (hasBarItems && !hasKitchenItems) {
      queue = 'Bar';
    } else if (hasBarItems && hasKitchenItems) {
      queue = 'Both';
    }

    const newOrder = {
      id: Date.now(),
      token: generateToken(),
      items: orderItems,
      status: 'pending',
      queue: queue,
      timestamp: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString()
    };
    
    setOrders([newOrder, ...orders]);
    setCart({});
  };

  const updateOrderStatus = (orderId, newStatus) => {
    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
  };

  const completeOrder = (orderId) => {
    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, status: 'completed', completedAt: new Date().toISOString() } : order
    ));
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
      if (item) {
        return { ...item, quantity: qty };
      }
      return null;
    }).filter(Boolean);

    if (orderItems.length === 0) return;

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

  if (error) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <h2 className="text-xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
          >
            Try Again
          </button>
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
            <a href="index.html" className="text-orange-600 hover:text-orange-700 font-medium">← Back to Home</a>
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
            <div className="bg-white border-b border-gray-200 rounded-t-lg">
              <div className="flex">
                <button
                  onClick={() => setOrderSubTab('active')}
                  className={`flex-1 px-6 py-3 font-medium transition-all rounded-t-lg ${
                    orderSubTab === 'active'
                      ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Active Orders
                </button>
                <button
                  onClick={() => setOrderSubTab('completed')}
                  className={`flex-1 px-6 py-3 font-medium transition-all rounded-t-lg ${
                    orderSubTab === 'completed'
                      ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Completed Orders
                </button>
              </div>
            </div>

            {orderSubTab === 'active' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Active Orders</h2>
                
                <div>
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                    Bar Queue ({orders.filter(order => order.status !== 'completed' && (order.queue === 'Bar' || order.queue === 'Both')).length})
                  </h3>
                  {orders.filter(order => order.status !== 'completed' && (order.queue === 'Bar' || order.queue === 'Both')).length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                      <p className="text-gray-500 text-lg">No Bar orders</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.filter(order => order.status !== 'completed' && (order.queue === 'Bar' || order.queue === 'Both')).map(order => (
                  <div key={order.id} className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="text-2xl font-bold text-gray-900">{order.token}</div>
                        <div className="text-sm text-gray-500">{order.date} • {order.timestamp}</div>
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
                        <div key={idx} className="flex justify-between text-sm py-1">
                          <span className="text-gray-700">{item.name} × {item.quantity}</span>
                          <span className="text-gray-900 font-medium">₹{item.price * item.quantity}</span>
                        </div>
                      ))}
                      <div className="border-t border-gray-300 mt-2 pt-2 flex justify-between font-bold">
                        <span>Total</span>
                        <span>₹{order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateOrderStatus(order.id, 'pending')}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          order.status === 'pending'
                            ? 'bg-yellow-500 text-white shadow-md'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Pending
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'preparing')}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          order.status === 'preparing'
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Preparing
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'ready')}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          order.status === 'ready'
                            ? 'bg-green-500 text-white shadow-md'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Ready
                      </button>
                      <button
                        onClick={() => completeOrder(order.id)}
                        className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all bg-purple-500 text-white hover:bg-purple-600"
                      >
                        Complete
                      </button>
                    </div>
                  </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {orderSubTab === 'completed' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Completed Orders</h2>
                {orders.filter(order => order.status === 'completed').length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                    <p className="text-gray-500 text-lg">No completed orders</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.filter(order => order.status === 'completed').map(order => (
                    <div key={order.id} className="bg-gray-50 rounded-xl shadow-md p-6 border border-gray-200">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="text-2xl font-bold text-gray-900">{order.token}</div>
                          <div className="text-sm text-gray-500">{order.date} • {order.timestamp}</div>
                          {order.completedAt && (
                            <div className="text-xs text-gray-400">
                              Completed: {new Date(order.completedAt).toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                        <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                          Completed
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 mb-4">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm py-1">
                            <span className="text-gray-700">{item.name} × {item.quantity}</span>
                            <span className="text-gray-900 font-medium">₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                        <div className="border-t border-gray-300 mt-2 pt-2 flex justify-between font-bold">
                          <span>Total</span>
                          <span>₹{order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)}</span>
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-blue-900 font-medium text-center">
                          Complete billing for this order from pikonik
                        </p>
                      </div>
                    </div>
                    ))}
                    </div>
                  )}
                </div>
                
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    Kitchen Queue ({orders.filter(order => order.status !== 'completed' && (order.queue === 'Kitchen' || order.queue === 'Both')).length})
                  </h3>
                  {orders.filter(order => order.status !== 'completed' && (order.queue === 'Kitchen' || order.queue === 'Both')).length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                      <p className="text-gray-500 text-lg">No Kitchen orders</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.filter(order => order.status !== 'completed' && (order.queue === 'Kitchen' || order.queue === 'Both')).map(order => (
                  <div key={order.id} className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="text-2xl font-bold text-gray-900">{order.token}</div>
                        <div className="text-sm text-gray-500">{order.date} • {order.timestamp}</div>
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
                        <div key={idx} className="flex justify-between text-sm py-1">
                          <span className="text-gray-700">{item.name} × {item.quantity}</span>
                          <span className="text-gray-900 font-medium">₹{item.price * item.quantity}</span>
                        </div>
                      ))}
                      <div className="border-t border-gray-300 mt-2 pt-2 flex justify-between font-bold">
                        <span>Total</span>
                        <span>₹{order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateOrderStatus(order.id, 'pending')}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          order.status === 'pending'
                            ? 'bg-yellow-500 text-white shadow-md'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Pending
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'preparing')}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          order.status === 'preparing'
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Preparing
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'ready')}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          order.status === 'ready'
                            ? 'bg-green-500 text-white shadow-md'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Ready
                      </button>
                      <button
                        onClick={() => completeOrder(order.id)}
                        className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all bg-purple-500 text-white hover:bg-purple-600"
                      >
                        Complete
                      </button>
                    </div>
                  </div>
                    ))}
                    </div>
                  )}
                </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'takeOrder' && (
          <div className="max-w-6xl mx-auto">
            {editingOrder && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-blue-900 font-medium">Editing Order</p>
                <p className="text-blue-700 text-sm">Modify items and click "Update Order"</p>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <span className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></span>
                Active Orders ({orders.filter(order => order.status !== 'completed').length})
              </h2>
              
              {orders.filter(order => order.status !== 'completed').length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl text-gray-400">📋</span>
                  </div>
                  <p className="text-gray-500 text-lg">No active orders</p>
                  <p className="text-gray-400 text-sm">Orders will appear here once placed</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {orders.filter(order => order.status !== 'completed').map(order => (
                    <div key={order.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-lg font-bold text-gray-900">{order.token}</div>
                          <div className="text-xs text-gray-500">{order.timestamp}</div>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'ready' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </div>
                      </div>
                      
                      <div className="space-y-1 mb-3">
                        {order.items.slice(0, 2).map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-600 truncate">{item.name} × {item.quantity}</span>
                            <span className="text-gray-900 font-medium">₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                        {order.items.length > 2 && (
                          <div className="text-xs text-gray-500 text-center">
                            +{order.items.length - 2} more items
                          </div>
                        )}
                      </div>
                      
                      <div className="border-t border-gray-100 pt-2">
                        <div className="flex justify-between text-sm font-bold">
                          <span>Total</span>
                          <span className="text-orange-600">₹{order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Items</h2>
              
              <div>
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  Kitchen Items
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {menuItems.filter(item => item.category === 'Kitchen').map(item => (
                    <div key={item.id} className="border-2 border-gray-200 rounded-xl p-4 hover:border-orange-300 transition-all">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-semibold text-gray-900 text-lg">{item.name}</div>
                          <div className="text-orange-600 font-medium">₹{item.price}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                        <button
                          onClick={() => updateCart(item.id, -1)}
                          className="w-10 h-10 flex items-center justify-center bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          −
                        </button>
                        
                        <div className="text-xl font-bold text-gray-900 min-w-[40px] text-center">
                          {cart[item.id] || 0}
                        </div>
                        
                        <button
                          onClick={() => updateCart(item.id, 1)}
                          className="w-10 h-10 flex items-center justify-center bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                  Bar Items
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {menuItems.filter(item => item.category === 'Bar').map(item => (
                    <div key={item.id} className="border-2 border-gray-200 rounded-xl p-4 hover:border-orange-300 transition-all">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-semibold text-gray-900 text-lg">{item.name}</div>
                          <div className="text-orange-600 font-medium">₹{item.price}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                        <button
                          onClick={() => updateCart(item.id, -1)}
                          className="w-10 h-10 flex items-center justify-center bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          −
                        </button>
                        
                        <div className="text-xl font-bold text-gray-900 min-w-[40px] text-center">
                          {cart[item.id] || 0}
                        </div>
                        
                        <button
                          onClick={() => updateCart(item.id, 1)}
                          className="w-10 h-10 flex items-center justify-center bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              </div>
            </div>

            {Object.keys(cart).length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h3>
                
                <div className="space-y-2 mb-4">
                  {Object.entries(cart).map(([itemId, qty]) => {
                    const item = menuItems.find(m => m.id === parseInt(itemId));
                    return item ? (
                      <div key={itemId} className="flex justify-between text-gray-700">
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
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Menu Items</h2>
              
              <div className="space-y-3 mb-6">
                {editingMenuItem && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-blue-900 font-medium">Editing Menu Item</p>
                    <p className="text-blue-700 text-sm">Modify details and click "Update Item"</p>
                  </div>
                )}
                
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
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                />
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                >
                  <option value="Kitchen">Kitchen</option>
                  <option value="Bar">Bar</option>
                </select>
                
                {editingMenuItem ? (
                  <div className="flex gap-3">
                    <button
                      onClick={cancelEditMenuItem}
                      className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={updateMenuItem}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                    >
                      Update Item
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={addMenuItem}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    + Add Menu Item
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {menuItems.map(item => (
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
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Error boundary wrapper
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-red-600 mb-4">Something went wrong</h2>
            <p className="text-gray-700 mb-4">{this.state.error}</p>
            <button 
              onClick={() => this.setState({ hasError: false, error: null })}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.render(
  <ErrorBoundary>
    <QSRBackend />
  </ErrorBoundary>, 
  document.getElementById('root')
);