import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const period = searchParams.get('period') || '7d';
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

  try {
    const [restaurant] = await sql`SELECT id FROM restaurants WHERE slug = ${slug}`;
    if (!restaurant) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const rid = restaurant.id;
    const days = period === '30d' ? 30 : period === '1d' ? 1 : 7;

    // Total revenue
    const [revenue] = await sql`
      SELECT
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(SUM(tip_amount), 0) as total_tips,
        COUNT(id) as total_receipts
      FROM receipts
      WHERE restaurant_id = ${rid}
        AND issued_at >= now() - (${days} || ' days')::interval
    `;

    // Revenue by day
    const revenueByDay = await sql`
      SELECT
        DATE(issued_at) as day,
        COALESCE(SUM(total), 0) as revenue,
        COUNT(id) as orders
      FROM receipts
      WHERE restaurant_id = ${rid}
        AND issued_at >= now() - (${days} || ' days')::interval
      GROUP BY DATE(issued_at)
      ORDER BY day ASC
    `;

    // Top selling items
    const topItems = await sql`
      SELECT
        oi.name,
        SUM(oi.quantity) as total_qty,
        SUM(oi.quantity * oi.price) as total_revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN table_sessions ts ON ts.id = o.session_id
      JOIN tables t ON t.id = ts.table_id
      WHERE t.restaurant_id = ${rid}
        AND o.created_at >= now() - (${days} || ' days')::interval
        AND o.payment_status = 'paid'
      GROUP BY oi.name
      ORDER BY total_qty DESC
      LIMIT 8
    `;

    // Payment method split
    const paymentSplit = await sql`
      SELECT
        payment_method,
        COUNT(*) as count,
        SUM(total) as revenue
      FROM receipts
      WHERE restaurant_id = ${rid}
        AND issued_at >= now() - (${days} || ' days')::interval
      GROUP BY payment_method
    `;

    // Busiest hours
    const busiestHours = await sql`
      SELECT
        EXTRACT(HOUR FROM o.created_at) as hour,
        COUNT(*) as orders
      FROM orders o
      JOIN table_sessions ts ON ts.id = o.session_id
      JOIN tables t ON t.id = ts.table_id
      WHERE t.restaurant_id = ${rid}
        AND o.created_at >= now() - (${days} || ' days')::interval
      GROUP BY hour
      ORDER BY hour ASC
    `;

    // Table performance
    const tablePerf = await sql`
      SELECT
        t.number as table_number,
        t.label,
        COUNT(DISTINCT ts.id) as sessions,
        COALESCE(SUM(o.total), 0) as revenue
      FROM tables t
      LEFT JOIN table_sessions ts ON ts.table_id = t.id
        AND ts.started_at >= now() - (${days} || ' days')::interval
      LEFT JOIN orders o ON o.session_id = ts.id
        AND o.payment_status = 'paid'
      WHERE t.restaurant_id = ${rid}
      GROUP BY t.id, t.number, t.label
      ORDER BY revenue DESC
    `;

    return NextResponse.json({
      period,
      revenue: {
        total: Number(revenue.total_revenue),
        tips: Number(revenue.total_tips),
        receipts: Number(revenue.total_receipts),
      },
      revenueByDay: revenueByDay.map(r => ({
        day: r.day,
        revenue: Number(r.revenue),
        orders: Number(r.orders),
      })),
      topItems: topItems.map(i => ({
        name: i.name,
        qty: Number(i.total_qty),
        revenue: Number(i.total_revenue),
      })),
      paymentSplit: paymentSplit.map(p => ({
        method: p.payment_method || 'unknown',
        count: Number(p.count),
        revenue: Number(p.revenue),
      })),
      busiestHours: busiestHours.map(h => ({
        hour: Number(h.hour),
        orders: Number(h.orders),
      })),
      tablePerf: tablePerf.map(t => ({
        table: t.table_number,
        label: t.label,
        sessions: Number(t.sessions),
        revenue: Number(t.revenue),
      })),
    });
  } catch (err) {
    console.error('[analytics]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
