const { useState, useEffect } = React;

// Tokenik Restaurant Token App - Backend (Updated with Kitchen/Bar tabs)


function QSRBackend() {
  const [activeTab, setActiveTab] = useState('orders');
  const [menuTab, setMenuTab] = useState('kitchen');
  const [menuItems, setMenuItems] = useState([
    { id: 1, name: 'Masala Dosa', price: 80, category: 'Kitchen' },
    { id: 2, name: 'Idli Sambhar', price: 60, category: 'Kitchen' },
    { id: 3, name: 'Filter Coffee', price: 40, category: 'Bar' },
    { id: 4, name: 'Vada', price: 50, category: 'Kitchen' }
  ]);
  const [orders, setOrders] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', price: '', category: 'Kitchen' });
  const [cart, setCart] = useState({});
  const [editingOrder, setEditingOrder] = useState(null);

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
    if (newItem.name && newItem.price ) {
      setMenuItems([...menuItems, {
        id: Date.now(),
        name: newItem.name,
        price: parseFloat(newItem.price),
        category: menuTab
      }]);
      setNewItem({ name: '', price: '' });
    }
  };

  const deleteMenuItem = (id) => {
    setMenuItems(menuItems.filter(item => item.id !== id));
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
      return { ...item, quantity: qty };
    });

    const newOrder = {
      id: Date.now(),
      token: generateToken(),
      items: orderItems,
      status: 'pending',
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
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Active Orders</h2>
            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <p className="text-gray-500 text-lg">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map(order => (
                  <div key={order.id} className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'takeOrder' && (
          <div className="max-w-4xl mx-auto">
            {editingOrder && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-blue-900 font-medium">Editing Order</p>
                <p className="text-blue-700 text-sm">Modify items and click "Update Order"</p>
              </div>
            )}
            
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Items</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {menuItems.map(item => (
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
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="border-b border-gray-200">
                <div className="flex">
                  <button
                    onClick={() => setMenuTab('kitchen')}
                    className={`flex-1 px-6 py-3 font-medium transition-all ${
                      menuTab === 'kitchen'
                        ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    🍽️ Kitchen Menu
                  </button>
                  <button
                    onClick={() => setMenuTab('bar')}
                    className={`flex-1 px-6 py-3 font-medium transition-all ${
                      menuTab === 'bar'
                        ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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
                  <button
                    onClick={() => {
                      setNewItem({ ...newItem, category: menuTab === 'kitchen' ? 'Kitchen' : 'Bar' });
                      addMenuItem();
                    }}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    + Add {menuTab === 'kitchen' ? 'Kitchen' : 'Bar'} Item
                  </button>
                </div>

                <div className="space-y-2">
                  {menuItems
                    .filter(item => item.category === (menuTab === 'kitchen' ? 'Kitchen' : 'Bar'))
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
                      <button
                        onClick={() => deleteMenuItem(item.id)}
                        className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  
                  {menuItems.filter(item => item.category === (menuTab === 'kitchen' ? 'Kitchen' : 'Bar')).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-lg">No {menuTab} items yet</p>
                      <p className="text-sm">Add some items to get started</p>
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