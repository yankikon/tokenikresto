const { useState, useEffect } = React;

function QSRTVDisplay() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const loadOrders = () => {
      const savedOrders = JSON.parse(localStorage.getItem('qsrOrders') || '[]');
      // Include all orders including delivered for Kanban board
      setOrders(savedOrders);
    };

    loadOrders();
    const interval = setInterval(loadOrders, 2000);

    return () => clearInterval(interval);
  }, []);

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
    return orders.filter(order => order.status === status);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50 p-8">
      <div className="text-center mb-12">
        <h1 className="text-6xl font-bold text-gray-900 mb-3">Order Status Board</h1>
        <p className="text-2xl text-gray-600">Please wait for your token to be called</p>
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
              <div key={order.id} className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-2xl font-bold text-gray-900">{order.token}</div>
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
                <p className="text-sm">No pending orders</p>
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
              <div key={order.id} className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-2xl font-bold text-gray-900">{order.token}</div>
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
                <p className="text-sm">No orders preparing</p>
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
              <div key={order.id} className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-2xl font-bold text-gray-900">{order.token}</div>
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
                <p className="text-sm">No orders ready</p>
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
              <div key={order.id} className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-2xl font-bold text-gray-900">{order.token}</div>
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
                <p className="text-sm">No delivered orders</p>
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

ReactDOM.render(<QSRTVDisplay />, document.getElementById('root'));