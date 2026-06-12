import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { orderId, action, agentName } = body;

    if (!orderId || !action) {
      return NextResponse.json({ error: 'Missing orderId or action' }, { status: 400 });
    }

    // First fetch current order to validate transition
    const [rows] = await pool.query('SELECT * FROM `orders` WHERE `id` = ?', [orderId]);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    const order = rows[0];

    let query = '';
    let params = [];

    if (action === 'accept') {
      if (order.status !== 'pending') {
        return NextResponse.json({ error: 'الطلب تم قبوله بالفعل' }, { status: 400 });
      }
      query = 'UPDATE `orders` SET `status` = ?, `agentName` = ?, `acceptedAt` = NOW() WHERE `id` = ?';
      params = ['accepted', agentName, orderId];
    } else if (action === 'confirmPayment') {
      if (order.status !== 'accepted') {
        return NextResponse.json({ error: 'يجب قبول الطلب أولاً' }, { status: 400 });
      }
      query = 'UPDATE `orders` SET `status` = ?, `paidAt` = NOW() WHERE `id` = ?';
      params = ['paid', orderId];
    } else if (action === 'confirmDelivery') {
      if (order.status !== 'paid') {
        return NextResponse.json({ error: 'يجب استلام الفلوس أولاً' }, { status: 400 });
      }
      query = 'UPDATE `orders` SET `status` = ?, `deliveredAt` = NOW() WHERE `id` = ?';
      params = ['delivered', orderId];
    } else if (action === 'delete') {
      if (order.status !== 'pending') {
        return NextResponse.json({ error: 'لا يمكن حذف طلب مقبول' }, { status: 400 });
      }
      query = 'DELETE FROM `orders` WHERE `id` = ?';
      params = [orderId];
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await pool.query(query, params);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
