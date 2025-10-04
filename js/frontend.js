const { useState, useEffect } = React;

function QSRTVDisplay() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const loadOrders = () => {
      const savedOrders = JSON.parse(localStorage.getItem('qsrOrders') || '[]');
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
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'pending': return '⏰';
      case 'preparing': return '👨‍🍳';
      case 'ready': return '✅';
      default: return null;
    }
  };

  const getStatusText = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50 p-8">
      <div className="text-center mb-12">
        <h1 className="text-6xl font-bold text-gray-900 mb-3">Order Status Board</h1>
        <p className="text-2xl text-gray-600">Please wait for your token to be called</p>
      </div>

      {orders.length === 0 ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <span className="text-6xl text-gray-400">⏰</span>
            </div>
            <p className="text-3xl text-gray-500 font-medium">No orders yet</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {orders.map(order => (
            <div
              key={order.id}
              className="bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all hover:scale-105"
            >
              <div className={`${getStatusColor(order.status)} p-6 text-white`}>
                <div className="flex items-center justify-between">
                  <div className="text-4xl font-bold tracking-wide">{order.token}</div>
                  <div className="bg-white bg-opacity-30 p-3 rounded-full text-2xl">
                    {getStatusIcon(order.status)}
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-3 mb-6">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="text-gray-700 text-lg">
                        {item.name} × {item.quantity}
                      </span>
                    </div>
                  ))}
                </div>

                <div className={`${getStatusColor(order.status)} text-white px-6 py-4 rounded-2xl text-center`}>
                  <div className="text-2xl font-bold uppercase tracking-wider">
                    {getStatusText(order.status)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="fixed bottom-8 right-8 flex items-center gap-3 bg-white px-6 py-3 rounded-full shadow-lg">
        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-gray-700 font-medium">Live Updates</span>
      </div>
    </div>
  );
}

ReactDOM.render(<QSRTVDisplay />, document.getElementById('root'));