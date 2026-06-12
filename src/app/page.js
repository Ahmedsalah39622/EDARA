'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  getOrders,
  addOrder,
  deleteOrder,
  subscribeToChanges,
  STATUS_INFO,
  DEPARTMENTS,
  timeAgo,
} from '@/app/lib/orders';

// Toast component
function Toast({ message, type, visible }) {
  return (
    <div className={`toast toast--${type} ${visible ? 'toast--visible' : ''}`}>
      <span>{type === 'success' ? '✅' : '❌'}</span>
      <span>{message}</span>
    </div>
  );
}

// Status badge
function StatusBadge({ status }) {
  const info = STATUS_INFO[status];
  return (
    <span className={`order-card__status order-card__status--${status}`}>
      <span>{info.emoji}</span>
      <span>{info.label}</span>
    </span>
  );
}

// Single order card
function OrderCard({ order, onDelete, isOwnOrder = false }) {
  return (
    <div className={`order-card order-card--${order.status}`}>
      {order.status === 'pending' && onDelete && (
        <button
          className="order-card__delete"
          onClick={() => onDelete(order.id)}
          title="حذف الطلب"
        >
          ✕
        </button>
      )}

      <div className="order-card__header">
        <div className="order-card__employee">
          <div className="order-card__name">{order.employeeName}</div>
          <div className="order-card__dept">🏢 {order.department}</div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="order-card__description">{order.description}</div>

      {order.notes && (
        <div className="order-card__notes">💬 {order.notes}</div>
      )}

      <div className="order-card__meta">
        {isOwnOrder && (
          <>
            <div className="order-card__price">
              السعر: <span className="order-card__price-value">{order.totalPrice} ج.م</span>
            </div>
            <div className="order-card__price">
              هيدفع: <span className="order-card__price-value">{order.amountPaying} ج.م</span>
            </div>
          </>
        )}
        <div className="order-card__time">⏰ {timeAgo(order.createdAt)}</div>
      </div>

      {order.agentName && (
        <div style={{ marginTop: '10px' }}>
          <span className="order-card__agent">
            🏍️ المندوب: {order.agentName}
          </span>
        </div>
      )}
    </div>
  );
}

export default function EmployeePage() {
  const [orders, setOrders] = useState([]);
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    employeeName: '',
    department: '',
    description: '',
    totalPrice: '',
    amountPaying: '',
    notes: '',
  });

  // Load orders on mount + subscribe to changes
  useEffect(() => {
    let active = true;
    getOrders().then(data => {
      if (active) setOrders(data || []);
    });
    const unsub = subscribeToChanges((updatedOrders) => {
      if (active) setOrders(updatedOrders || []);
    });
    return () => {
      active = false;
      unsub();
    };
  }, []);

  // Auto-refresh every 5 seconds (for cross-tab awareness)
  useEffect(() => {
    let active = true;
    const interval = setInterval(async () => {
      const data = await getOrders();
      if (active) setOrders(data || []);
    }, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Restore name & department from last submission
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedName = sessionStorage.getItem('emp_name') || '';
      const savedDept = sessionStorage.getItem('emp_dept') || '';
      if (savedName || savedDept) {
        setFormData(prev => ({
          ...prev,
          employeeName: savedName,
          department: savedDept,
        }));
      }
    }
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { employeeName, department, description, totalPrice, amountPaying } = formData;

    if (!employeeName.trim() || !department || !description.trim() || !totalPrice || !amountPaying) {
      showToast('من فضلك املا كل البيانات المطلوبة', 'error');
      setIsSubmitting(false);
      return;
    }

    if (Number(totalPrice) <= 0 || Number(amountPaying) <= 0) {
      showToast('السعر لازم يكون أكبر من صفر', 'error');
      setIsSubmitting(false);
      return;
    }

    try {
      addOrder(formData);
      // Save name & department for next time
      sessionStorage.setItem('emp_name', employeeName);
      sessionStorage.setItem('emp_dept', department);

      // Reset only order-specific fields
      setFormData(prev => ({
        ...prev,
        description: '',
        totalPrice: '',
        amountPaying: '',
        notes: '',
      }));

      showToast('تم إرسال الطلب بنجاح! 🎉');
    } catch (err) {
      showToast(err.message || 'حصل خطأ', 'error');
    }

    setIsSubmitting(false);
  };

  const handleDelete = (orderId) => {
    if (!confirm('متأكد إنك عايز تحذف الطلب ده؟')) return;
    try {
      deleteOrder(orderId);
      showToast('تم حذف الطلب');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Filter and sort safely
  const myOrders = (orders || []).filter(o =>
    o && o.employeeName && formData.employeeName &&
    o.employeeName.trim().toLowerCase() === formData.employeeName.trim().toLowerCase()
  );
  const otherOrders = (orders || []).filter(o =>
    !o || !o.employeeName || !formData.employeeName ||
    o.employeeName.trim().toLowerCase() !== formData.employeeName.trim().toLowerCase()
  );

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <span className="header__icon">🍔</span>
        <h1 className="header__title">سيستم الطلبات</h1>
        <p className="header__subtitle">اطلب فطارك وأوردراتك بسهولة — وتابع حالة طلبك لحظة بلحظة</p>
      </header>

      {/* Order Form */}
      <div className="glass-card">
        <h2 className="glass-card__title">
          <span className="glass-card__title-icon">📝</span>
          طلب جديد
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="employeeName">اسمك *</label>
              <input
                id="employeeName"
                name="employeeName"
                type="text"
                className="form-input"
                placeholder="مثلاً: أحمد محمود"
                value={formData.employeeName}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="department">الإدارة *</label>
              <select
                id="department"
                name="department"
                className="form-select"
                value={formData.department}
                onChange={handleInputChange}
                required
              >
                <option value="">اختر الإدارة</option>
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div className="form-group form-group--full">
              <label className="form-label" htmlFor="description">وصف الطلب *</label>
              <textarea
                id="description"
                name="description"
                className="form-textarea"
                placeholder="مثلاً: 2 ساندوتش فول + عصير برتقال + شاي"
                value={formData.description}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="totalPrice">السعر الإجمالي (ج.م) *</label>
              <input
                id="totalPrice"
                name="totalPrice"
                type="number"
                className="form-input"
                placeholder="0"
                min="0"
                step="0.5"
                value={formData.totalPrice}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="amountPaying">هتدفع كام؟ (ج.م) *</label>
              <input
                id="amountPaying"
                name="amountPaying"
                type="number"
                className="form-input"
                placeholder="0"
                min="0"
                step="0.5"
                value={formData.amountPaying}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group form-group--full">
              <label className="form-label" htmlFor="notes">ملاحظات (اختياري)</label>
              <input
                id="notes"
                name="notes"
                type="text"
                className="form-input"
                placeholder="مثلاً: من غير طحينة، أو عايز كاتشب زيادة"
                value={formData.notes}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--full"
            disabled={isSubmitting}
            style={{ marginTop: '16px', fontSize: '16px', padding: '14px' }}
          >
            {isSubmitting ? '⏳ جاري الإرسال...' : '🚀 إرسال الطلب'}
          </button>
        </form>
      </div>

      {/* My Orders */}
      {myOrders.length > 0 && (
        <div>
          <h2 className="section-title">
            <span className="section-title__icon">📋</span>
            طلباتي
            <span className="section-title__count">{myOrders.length}</span>
          </h2>
          {myOrders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onDelete={order.status === 'pending' ? handleDelete : null}
              isOwnOrder={true}
            />
          ))}
        </div>
      )}

      {/* Other Orders */}
      {otherOrders.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h2 className="section-title">
            <span className="section-title__icon">👥</span>
            كل الطلبات
            <span className="section-title__count">{otherOrders.length}</span>
          </h2>
          {otherOrders.map(order => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}

      {/* If no name entered, show all orders */}
      {!formData.employeeName.trim() && orders.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h2 className="section-title">
            <span className="section-title__icon">📋</span>
            كل الطلبات
            <span className="section-title__count">{orders.length}</span>
          </h2>
          {orders.map(order => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {orders.length === 0 && (
        <div className="empty-state">
          <span className="empty-state__icon">🍽️</span>
          <div className="empty-state__text">مفيش طلبات لسه</div>
          <div className="empty-state__sub">اعمل أول طلب من الفورم فوق!</div>
        </div>
      )}

      {/* Toast */}
      <Toast message={toast.message} type={toast.type} visible={toast.visible} />
    </div>
  );
}
