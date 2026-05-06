import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const [orderEnabled, setOrderEnabled] = useState(true);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    daily: 0,
    weekly: 0,
    monthly: 0,
    yearly: 0
  });
  const [showStats, setShowStats] = useState(false);

  const audioRef = useRef(null);
  const navigate = useNavigate();

  // 🔐 AUTH CHECK
  useEffect(() => {
    if (!localStorage.getItem("adminAuth")) {
      navigate("/admin-login");
    }
  }, [navigate]);

  // 📊 FETCH VISITS
  useEffect(() => {
    fetch("https://namaste-cafe-backend.onrender.com/visit-stats")
      .then(res => res.json())
      .then(data => setStats(data));
  }, []);

  // 🔄 ORDER STATUS TOGGLE
  useEffect(() => {
    fetch("https://namaste-cafe-backend.onrender.com/order-status")
      .then(res => res.json())
      .then(data => setOrderEnabled(data.enabled));
  }, []);

  const toggleOrders = async () => {
    const res = await fetch(
      "https://namaste-cafe-backend.onrender.com/toggle-orders",
      { method: "POST" }
    );
    const data = await res.json();
    setOrderEnabled(data.enabled);
  };

  // 📦 FETCH ORDERS (AUTO REFRESH)
useEffect(() => {
  const fetchOrders = () => {
    fetch("https://namaste-cafe-backend.onrender.com/orders")
      .then(res => res.json())
      .then(data => {
        setOrders(
          data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        );
      });
  };

  fetchOrders(); // first load

  const interval = setInterval(fetchOrders, 5000); // every 2 sec

  return () => clearInterval(interval); // cleanup
}, []);

  // 🔊 SOCKET
  useEffect(() => {
    const socket = io("https://namaste-cafe-backend.onrender.com");

    socket.on("newOrder", newOrder => {
      setOrders(prev => [newOrder, ...prev]);
    });

    socket.on("orderUpdated", updatedOrder => {
      setOrders(prev =>
        prev.map(o => (o.id === updatedOrder.id ? updatedOrder : o))
      );
    });

    return () => socket.disconnect();
  }, []);

  // 🕒 DELIVERY TIME
  const getDeliveryTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // 🔄 UPDATE STATUS
 const updateStatus = async (index, status) => {
  const order = orders[index];

  try {
    const res = await fetch(
      `https://namaste-cafe-backend.onrender.com/orders/${order.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      }
    );

    const updatedOrder = await res.json();

    setOrders(prev =>
      prev.map(o => (o.id === updatedOrder.id ? updatedOrder : o))
    );

    // WhatsApp message
    let message = "";

    if (status === "Accepted") {
      message = ` Namaste Cafe

Hi ${order.name}, your order is being prepared 
ETA: ${getDeliveryTime()}`;
    }

    if (status === "Delivered") {
      message = ` Your order has been delivered!

Thank you for ordering from Namaste Cafe`;
    }

    if (message) {
      window.open(
        `https://wa.me/91${order.phone}?text=${encodeURIComponent(message)}`
      );
    }

  } catch (err) {
    alert("Failed to update order");
    console.error(err);
  }
};
  return (
    <div className="dashboard">
      <h1>📦 Orders Dashboard</h1>

<div className="top-bar">
  <button className="btn btn-blue" onClick={() => setShowStats(true)}>
    📊 Website Visits
  </button>

  <button className="btn btn-red" onClick={toggleOrders}>
    {orderEnabled ? "Disable Orders ❌" : "Enable Orders ✅"}
  </button>

  <button
    className="btn btn-gray"
    onClick={() => {
      localStorage.removeItem("adminAuth");
      window.location.href = "/admin";
    }}
  >
    Logout
  </button>
</div>

      {/* 📦 ORDERS */}
      {orders.length === 0 ? (
        <p>No orders yet</p>
      ) : (
        orders.map((order, index) => {
          return (
  <div key={order.id} className="order-card">

    <h3>📦 Order #{order.id}</h3>

    <p><strong>Name:</strong> {order.name}</p>
    <p><strong>Phone:</strong> {order.phone}</p>
    <p><strong>Address:</strong> {order.address}</p>

    {/* ITEMS */}
    <div className="items-box">
      <strong>Items:</strong>
      {order.items.map((item, i) => (
        <div key={i}>
          • {item.name} × {item.qty} — ₹{item.price * item.qty}
        </div>
      ))}
    </div>

    {/* TOTAL */}
    <p><strong>Total:</strong> ₹{order.total}</p>

    {/* STATUS */}
    <p>
      <strong>Status:</strong>{" "}
      <span className={`status ${order.status}`}>
        {order.status}
      </span>
    </p>

    {/* RIDER */}
    <p>
      <strong>Rider:</strong>{" "}
      <span className={`status ${order.riderStatus}`}>
        {order.riderStatus}
      </span>
    </p>

    {/* DELIVERY LINK */}
    {order.deliveryToken && (
      <div className="delivery-link">
        <input
          value={`https://namastecafebgp.com/deliver/${order.deliveryToken}`}
          readOnly
        />
        <button
          onClick={() =>
            navigator.clipboard.writeText(
              `https://namastecafebgp.com/deliver/${order.deliveryToken}`
            )
          }
        >
          Copy
        </button>
      </div>
    )}

    {/* ACTION BUTTONS */}
    <div className="actions">
      <button onClick={() => updateStatus(index, "Accepted")}>
        Accept
      </button>

      <button onClick={() => updateStatus(index, "Delivered")}>
        Delivered
      </button>
    </div>

    </div>
    );
  })
)}

      {/* 📊 MODAL */}
      {showStats && (
        <div className="modal-overlay">
          <div className="modal-box">
            <button onClick={() => setShowStats(false)}>Close</button>

            <h2>Website Analytics</h2>

            <p>Total: {stats.total}</p>
            <p>Today: {stats.daily}</p>
            <p>Week: {stats.weekly}</p>
            <p>Month: {stats.monthly}</p>
            <p>Year: {stats.yearly}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
