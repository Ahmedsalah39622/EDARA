/**
 * Order Management System - localStorage based
 * 
 * Order statuses: pending → accepted → paid → delivered
 * Cross-tab sync via 'storage' event
 */

const STORAGE_KEY = 'mandoob_orders';

// Generate a unique ID
function generateId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
}

// Get all orders from localStorage
export function getOrders() {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Save orders to localStorage
function saveOrders(orders) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  // Dispatch a custom event for same-tab updates
  window.dispatchEvent(new CustomEvent('orders-updated', { detail: orders }));
}

// Add a new order
export function addOrder({ employeeName, department, description, totalPrice, amountPaying, notes }) {
  const orders = getOrders();
  const newOrder = {
    id: generateId(),
    employeeName,
    department,
    description,
    totalPrice: Number(totalPrice),
    amountPaying: Number(amountPaying),
    notes: notes || '',
    status: 'pending',
    agentName: null,
    createdAt: new Date().toISOString(),
    acceptedAt: null,
    paidAt: null,
    deliveredAt: null,
  };
  orders.unshift(newOrder);
  saveOrders(orders);
  return newOrder;
}

// Agent accepts an order
export function acceptOrder(orderId, agentName) {
  const orders = getOrders();
  const order = orders.find(o => o.id === orderId);
  if (!order) throw new Error('الطلب غير موجود');
  if (order.status !== 'pending') throw new Error('الطلب تم قبوله بالفعل');
  order.status = 'accepted';
  order.agentName = agentName;
  order.acceptedAt = new Date().toISOString();
  saveOrders(orders);
  return order;
}

// Agent confirms payment received
export function confirmPayment(orderId) {
  const orders = getOrders();
  const order = orders.find(o => o.id === orderId);
  if (!order) throw new Error('الطلب غير موجود');
  if (order.status !== 'accepted') throw new Error('لازم تقبل الطلب الأول');
  order.status = 'paid';
  order.paidAt = new Date().toISOString();
  saveOrders(orders);
  return order;
}

// Agent confirms delivery
export function confirmDelivery(orderId) {
  const orders = getOrders();
  const order = orders.find(o => o.id === orderId);
  if (!order) throw new Error('الطلب غير موجود');
  if (order.status !== 'paid') throw new Error('لازم تستلم الفلوس الأول');
  order.status = 'delivered';
  order.deliveredAt = new Date().toISOString();
  saveOrders(orders);
  return order;
}

// Delete an order (only pending)
export function deleteOrder(orderId) {
  const orders = getOrders();
  const index = orders.findIndex(o => o.id === orderId);
  if (index === -1) throw new Error('الطلب غير موجود');
  if (orders[index].status !== 'pending') throw new Error('مينفعش تحذف طلب تم قبوله');
  orders.splice(index, 1);
  saveOrders(orders);
}

// Subscribe to order changes (cross-tab + same-tab)
export function subscribeToChanges(callback) {
  // Listen for changes from OTHER tabs
  const handleStorage = (e) => {
    if (e.key === STORAGE_KEY) {
      callback(getOrders());
    }
  };
  // Listen for changes from THIS tab
  const handleCustom = (e) => {
    callback(e.detail);
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener('orders-updated', handleCustom);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('orders-updated', handleCustom);
  };
}

// Status display info
export const STATUS_INFO = {
  pending: { label: 'في الانتظار', emoji: '🟡', color: '#f59e0b' },
  accepted: { label: 'تم القبول', emoji: '🔵', color: '#3b82f6' },
  paid: { label: 'تم استلام الفلوس', emoji: '🟢', color: '#22c55e' },
  delivered: { label: 'تم التسليم', emoji: '✅', color: '#10b981' },
};

// Department list
export const DEPARTMENTS = [
  'الإدارة العامة',
  'تكنولوجيا المعلومات',
  'الموارد البشرية',
  'المالية',
  'التسويق',
  'المبيعات',
  'خدمة العملاء',
  'العمليات',
  'القانونية',
  'أخرى',
];

// Format time ago in Arabic
export function timeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'الآن';
  if (diffMins < 60) return `من ${diffMins} دقيقة`;
  if (diffHours < 24) return `من ${diffHours} ساعة`;
  return date.toLocaleDateString('ar-EG');
}
