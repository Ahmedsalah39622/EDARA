import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';

// GET all orders sorted by date desc
export async function GET() {
  try {
    const [rows] = await pool.query('SELECT * FROM `orders` ORDER BY `createdAt` DESC');
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
  }
}

// POST create a new order
export async function POST(request) {
  try {
    const body = await request.json();
    const { id, employeeName, department, description, totalPrice, amountPaying, notes } = body;

    if (!id || !employeeName || !department || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const query = `
      INSERT INTO \`orders\` 
      (\`id\`, \`employeeName\`, \`department\`, \`description\`, \`totalPrice\`, \`amountPaying\`, \`notes\`, \`status\`, \`createdAt\`) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
    `;

    await pool.query(query, [
      id,
      employeeName,
      department,
      description,
      Number(totalPrice),
      Number(amountPaying),
      notes || ''
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
