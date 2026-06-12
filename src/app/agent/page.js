'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  getOrders,
  acceptOrder,
  confirmPayment,
  confirmDelivery,
  subscribeToChanges,
  STATUS_INFO,
  timeAgo,
} from '@/app/lib/orders';

const SESSION_KEY = 'mandoob_agent_name';

export default function AgentPage() {
  const [agentName, setAgentName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [toast, setToast] = useState({ message: '', type: '', visible: false });

  // Load agent name from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      setAgentName(saved);
    }
  }, []);

  // Load orders and subscribe to changes
  useEffect(() => {
    let active = true;
    getOrders().then(data => {
      if (active) setOrders(data || []);
    });
    const unsubscribe = subscribeToChanges((updated) => {
      if (active) setOrders(updated || []);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Toast helper
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3000);
  }, []);

  // Handle agent login
  const handleLogin = (e) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setAgentName(trimmed);
    sessionStorage.setItem(SESSION_KEY, trimmed);
    setNameInput('');
    showToast(`أهلاً بيك يا ${trimmed} 👋`);
  };

  // Handle changing agent name
  const handleChangeName = () => {
    setAgentName('');
    sessionStorage.removeItem(SESSION_KEY);
  };

  // Action: Accept order
  const handleAccept = (orderId) => {
    try {
      acceptOrder(orderId, agentName);
      showToast('تم قبول الطلب بنجاح ✅');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Action: Confirm payment
  const handleConfirmPayment = (orderId) => {
    try {
      confirmPayment(orderId);
      showToast('تم تأكيد استلام الفلوس 💰');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Action: Confirm delivery
  const handleConfirmDelivery = (orderId) => {
    try {
      confirmDelivery(orderId);
      showToast('تم تسليم الأوردر بنجاح 📦');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Filtered orders for each tab
  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const myAcceptedOrders = orders.filter(
    (o) => o.status === 'accepted' && o.agentName === agentName
  );
  const myPaidOrders = orders.filter(
    (o) => o.status === 'paid' && o.agentName === agentName
  );
  const myDeliveredOrders = orders.filter(
    (o) => o.status === 'delivered' && o.agentName === agentName
  );

  // Stats
  const totalCollectedToday = orders
    .filter((o) => {
      if (o.agentName !== agentName) return false;
      if (!o.paidAt) return false;
      const paid = new Date(o.paidAt);
      const today = new Date();
      return (
        paid.getDate() === today.getDate() &&
        paid.getMonth() === today.getMonth() &&
        paid.getFullYear() === today.getFullYear()
      );
    })
    .reduce((sum, o) => sum + (o.amountPaying || 0), 0);

  const tabs = [
    { label: 'طلبات جديدة', emoji: '🆕', count: pendingOrders.length },
    { label: 'استلام الفلوس', emoji: '💰', count: myAcceptedOrders.length },
    { label: 'تسليم الأوردرات', emoji: '📦', count: myPaidOrders.length },
  ];

  // If agent not logged in
  if (!agentName) {
    return (
      <div className="app-container">
        <header className="header">
          <span className="header__icon">🛵</span>
          <h1 className="header__title">صفحة المندوب</h1>
          <p className="header__subtitle">إدارة التوصيل واستلام الفلوس</p>
          <Link href="/" className="header__nav-link">
            ← صفحة الموظفين
          </Link>
        </header>

        <div className="agent-login">
          <h2 className="agent-login__title">👋 مرحباً بيك!</h2>
          <p className="agent-login__subtitle">
            اكتب اسمك عشان تبدأ تستقبل طلبات
          </p>
          <form className="agent-login__form" onSubmit={handleLogin}>
            <input
              className="agent-login__input"
              type="text"
              placeholder="اسمك إيه يا كابتن؟"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn btn--primary">
              دخول
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <span className="header__icon">🛵</span>
        <h1 className="header__title">صفحة المندوب</h1>
        <p className="header__subtitle">
          أهلاً يا <strong>{agentName}</strong> 👋
          <button
            className="btn btn--ghost btn--sm"
            onClick={handleChangeName}
            style={{ marginRight: '12px' }}
          >
            تغيير الاسم
          </button>
        </p>
        <Link href="/" className="header__nav-link">
          ← صفحة الموظفين
        </Link>
      </header>

      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat-card stat-card--pending">
          <span className="stat-card__value">{pendingOrders.length}</span>
          <span className="stat-card__label">طلبات جديدة</span>
        </div>
        <div className="stat-card stat-card--accepted">
          <span className="stat-card__value">{myAcceptedOrders.length}</span>
          <span className="stat-card__label">قبلتها</span>
        </div>
        <div className="stat-card stat-card--paid">
          <span className="stat-card__value">{myPaidOrders.length}</span>
          <span className="stat-card__label">استلمت فلوسها</span>
        </div>
        <div className="stat-card stat-card--delivered">
          <span className="stat-card__value">{myDeliveredOrders.length}</span>
          <span className="stat-card__label">تم تسليمها</span>
        </div>
        <div className="stat-card stat-card--total">
          <span className="stat-card__value">{totalCollectedToday} ج.م</span>
          <span className="stat-card__label">فلوس النهارده</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map((tab, index) => (
          <button
            key={index}
            className={`tab ${activeTab === index ? 'tab--active' : ''}`}
            onClick={() => setActiveTab(index)}
          >
            {tab.emoji} {tab.label}
            <span className="tab__badge">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Tab 0: New / Pending Orders */}
      {activeTab === 0 && (
        <div>
          {pendingOrders.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state__icon">🎉</span>
              <p className="empty-state__text">مفيش طلبات جديدة</p>
              <p className="empty-state__sub">
                كل الطلبات اتقبلت! استنى طلبات جديدة
              </p>
            </div>
          ) : (
            pendingOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                actionLabel="قبول الطلب"
                actionEmoji="✅"
                actionClass="btn--blue"
                onAction={() => handleAccept(order.id)}
              />
            ))
          )}
        </div>
      )}

      {/* Tab 1: Collect Money */}
      {activeTab === 1 && (
        <div>
          {myAcceptedOrders.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state__icon">💰</span>
              <p className="empty-state__text">مفيش طلبات محتاجة فلوس</p>
              <p className="empty-state__sub">
                اقبل طلبات من التاب الأولاني الأول
              </p>
            </div>
          ) : (
            myAcceptedOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                actionLabel="تأكيد استلام الفلوس"
                actionEmoji="💰"
                actionClass="btn--warning"
                onAction={() => handleConfirmPayment(order.id)}
              />
            ))
          )}
        </div>
      )}

      {/* Tab 2: Deliver Orders */}
      {activeTab === 2 && (
        <div>
          {myPaidOrders.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state__icon">📦</span>
              <p className="empty-state__text">مفيش طلبات محتاجة تسليم</p>
              <p className="empty-state__sub">
                استلم الفلوس من التاب اللي قبل ده الأول
              </p>
            </div>
          ) : (
            myPaidOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                actionLabel="تأكيد التسليم"
                actionEmoji="📦"
                actionClass="btn--success"
                onAction={() => handleConfirmDelivery(order.id)}
              />
            ))
          )}
        </div>
      )}

      {/* Toast Notification */}
      <div
        className={`toast toast--${toast.type} ${
          toast.visible ? 'toast--visible' : ''
        }`}
      >
        {toast.message}
      </div>
    </div>
  );
}

// ─── Order Card Component ───────────────────────────────────────────
function OrderCard({ order, actionLabel, actionEmoji, actionClass, onAction }) {
  const statusInfo = STATUS_INFO[order.status];

  return (
    <div className={`order-card order-card--${order.status}`}>
      <div className="order-card__header">
        <div className="order-card__employee">
          <div className="order-card__name">{order.employeeName}</div>
          <div className="order-card__dept">🏢 {order.department}</div>
        </div>
        <span
          className={`order-card__status order-card__status--${order.status}`}
        >
          {statusInfo.emoji} {statusInfo.label}
        </span>
      </div>

      <div className="order-card__description">{order.description}</div>

      {order.notes && (
        <div className="order-card__notes">📝 {order.notes}</div>
      )}

      <div className="order-card__meta">
        <span className="order-card__price">
          💵 الإجمالي:{' '}
          <span className="order-card__price-value">
            {order.totalPrice} ج.م
          </span>
        </span>
        <span className="order-card__price">
          💳 المطلوب:{' '}
          <span className="order-card__price-value">
            {order.amountPaying} ج.م
          </span>
        </span>
        <span className="order-card__time">
          🕐 {timeAgo(order.createdAt)}
        </span>
      </div>

      {order.agentName && (
        <div className="order-card__agent" style={{ marginTop: '10px' }}>
          🛵 {order.agentName}
        </div>
      )}

      <div className="order-card__actions">
        <button
          className={`btn ${actionClass} btn--full`}
          onClick={onAction}
        >
          {actionEmoji} {actionLabel}
        </button>
      </div>
    </div>
  );
}
