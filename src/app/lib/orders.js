/**
 * Order Management System - MySQL API Backend Connection with Polling
 * 
 * Order statuses: pending → accepted → paid → delivered
 */

// Local cache to check changes
let ordersCache = [];

// Generate a unique ID
function generateId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
}

// Fetch all orders from backend database
export async function getOrders() {
  try {
    const res = await fetch('/api/orders', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    ordersCache = data;
    return data;
  } catch (error) {
    console.error('Error in getOrders:', error);
    return ordersCache; // fallback to cache
  }
}

// Add a new order
export async function addOrder({ employeeName, department, description, totalPrice, amountPaying, notes }) {
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
  };

  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newOrder),
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || 'Failed to add order');
  }

  // Trigger local callbacks instantly
  const updatedOrders = [newOrder, ...ordersCache];
  ordersCache = updatedOrders;
  window.dispatchEvent(new CustomEvent('orders-updated', { detail: updatedOrders }));

  return newOrder;
}

// Agent accepts an order
export async function acceptOrder(orderId, agentName) {
  const res = await fetch('/api/orders/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, action: 'accept', agentName }),
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || 'Failed to accept order');
  }

  // Fetch latest immediately
  return await getOrders();
}

// Agent confirms payment received
export async function confirmPayment(orderId) {
  const res = await fetch('/api/orders/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, action: 'confirmPayment' }),
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || 'Failed to confirm payment');
  }

  return await getOrders();
}

// Agent confirms delivery
export async function confirmDelivery(orderId) {
  const res = await fetch('/api/orders/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, action: 'confirmDelivery' }),
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || 'Failed to confirm delivery');
  }

  return await getOrders();
}

// Delete an order (only pending)
export async function deleteOrder(orderId) {
  const res = await fetch('/api/orders/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, action: 'delete' }),
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || 'Failed to delete order');
  }

  return await getOrders();
}

// Subscribe to order changes (calls DB every 3 seconds to keep sync across all mobile devices)
export function subscribeToChanges(callback) {
  // Initial load
  getOrders().then(callback);

  // Poll server for updates
  const intervalId = setInterval(async () => {
    const latestOrders = await getOrders();
    callback(latestOrders);
  }, 3000);

  // Still support custom local events for instant UI feedback
  const handleCustom = (e) => {
    callback(e.detail);
  };

  window.addEventListener('orders-updated', handleCustom);

  return () => {
    clearInterval(intervalId);
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
  if (!dateString) return '';
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
