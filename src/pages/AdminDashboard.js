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
            data.sort(
              (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            )
          );
        });
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);

    return () => clearInterval(interval);
  }, []);

  // 🔊 SOCKET
  useEffect(() => {
    const socket = io("https://namaste-cafe-backend.onrender.com");

    socket.on("newOrder", newOrder => {
      setOrders(prev => [newOrder, ...prev]);

      if (audioRef.current) {
        audioRef.current.play().catch(() => {
          console.log("Sound blocked until user interacts");
        });
      }
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
    now.setMinutes(now.getMinutes() + 35);
    return now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // 🔄 UPDATE STATUS
  const updateStatus = async (order, status) => {
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

      let message = "";

      if (status === "Accepted") {
        message = `Namaste Cafe

Hi ${order.name}, Your order has been received and is now being freshly prepared 
ETA: ${getDeliveryTime()}`;
      }

      if (status === "Ready") {
        message = `Namaste Cafe

Hi ${order.name}, Good news! Your order is ready and on its way 
We’re just a few moments away from your doorstep`;
      }

      if (status === "Delivered") {
        message = `Namaste Cafe

Hi ${order.name}, Your order has been delivered successfully
We hope you enjoy every bite!  
Thank you for choosing us`;
      }

      if (status === "Rejected") {
        message = `Namaste Cafe

Hi ${order.name}, We’re sorry, but we couldn’t process your order this time
Please try again in a while — we’d love to serve you soon`;
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

      {/* 🔊 AUDIO */}
      <audio ref={audioRef} src="/sound.mp3" preload="auto" />

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
        orders.map(order => (
          <div key={order.id} className="order-card">

            <h3>📦 Order #{order.id}</h3>

            <p><strong>Name:</strong> {order.name}</p>
            <p><strong>Phone:</strong> {order.phone}</p>
            <p><strong>Address:</strong> {order.address}</p>

            <div className="items-box">
              <strong>Items:</strong>
              {order.items?.map((item, i) => {
                const qty = item.quantity || item.qty || 1;
                const price = item.price || 0;

                return (
                  <div key={i}>
                    • {item.name} × {qty} — ₹{price * qty}
                  </div>
                );
              })}
            </div>

            <p><strong>Total:</strong> ₹{order.total}</p>

            <p>
              <strong>Status:</strong>{" "}
              <span className={`status ${order.status}`}>
                {order.status}
              </span>
            </p>

            <p>
              <strong>Rider:</strong>{" "}
              <span className={`status ${order.riderStatus}`}>
                {order.riderStatus}
              </span>
            </p>

            {order.deliveryToken && (
              <>
                <div className="delivery-section">
                  <input
                    className="delivery-input"
                    value={`https://namastecafebgp.com/deliver/${order.deliveryToken}`}
                    readOnly
                  />

                  <button
                    className="copy-btn"
                    onClick={() =>
                      navigator.clipboard.writeText(
                        `https://namastecafebgp.com/deliver/${order.deliveryToken}`
                      )
                    }
                  >
                    📋 Copy Link
                  </button>
                </div>

                <div className="action-buttons">
                  {order.status === "Pending" && (
                    <button className="btn-primary" onClick={() => updateStatus(order, "Accepted")}>
                      Accept
                    </button>
                  )}

                  {order.status === "Accepted" && (
                    <button className="btn-primary" onClick={() => updateStatus(order, "Ready")}>
                      Ready
                    </button>
                  )}

                  {order.status === "Ready" && (
                    <button className="btn-success" onClick={() => updateStatus(order, "Delivered")}>
                      Delivered
                    </button>
                  )}

                  {order.status !== "Delivered" && order.status !== "Rejected" && (
                    <button className="btn-danger" onClick={() => updateStatus(order, "Rejected")}>
                      Reject
                    </button>
                  )}
                </div>
              </>
            )}

          </div>
        ))
      )}

      {/* 📊 MODAL (FIXED POSITION) */}
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
