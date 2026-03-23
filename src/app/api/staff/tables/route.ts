import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json(
      { error: 'slug is required' },
      { status: 400 }
    );
  }

  try {
    const tables = await sql`
      SELECT
        t.id,
        t.number,
        t.label,
        t.status,
        t.restaurant_id,
        s.id as session_id,
        s.status as session_status,
        s.session_type,
        s.started_at,
        COUNT(DISTINCT o.id) as order_count,
        COALESCE(SUM(o.total), 0) as session_total
      FROM tables t
      LEFT JOIN table_sessions s
        ON s.table_id = t.id AND s.status = 'active'
      LEFT JOIN orders o
        ON o.session_id = s.id
      WHERE t.restaurant_id = (
        SELECT id FROM restaurants WHERE slug = ${slug}
      )
      GROUP BY t.id, t.number, t.label, t.status, t.restaurant_id,
               s.id, s.status, s.session_type, s.started_at
      ORDER BY t.number ASC
    `;

    return NextResponse.json({ tables });
  } catch (error) {
    console.error('GET /api/staff/tables error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tables' },
      { status: 500 }
    );
  }
}
