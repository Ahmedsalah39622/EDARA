import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';

// GET all orders sorted by date desc
export async function GET() {
  try {
    // Ensure table exists on first query
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(50) PRIMARY KEY,
        employeeName VARCHAR(255) NOT NULL,
        department VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        totalPrice DECIMAL(10, 2) NOT NULL,
        amountPaying DECIMAL(10, 2) NOT NULL,
        notes TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        agentName VARCHAR(255) DEFAULT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        acceptedAt TIMESTAMP NULL DEFAULT NULL,
        paidAt TIMESTAMP NULL DEFAULT NULL,
        deliveredAt TIMESTAMP NULL DEFAULT NULL
      );
    `);

    const { rows } = await pool.query('SELECT * FROM orders ORDER BY createdAt DESC');
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
      INSERT INTO orders 
      (id, employeeName, department, description, totalPrice, amountPaying, notes, status, createdAt) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())
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
