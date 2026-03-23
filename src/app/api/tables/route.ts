import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET — fetch table by restaurant slug and table number
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const number = searchParams.get('number');

  if (!slug || !number) {
    return NextResponse.json(
      { error: 'slug and number are required' },
      { status: 400 }
    );
  }

  try {
    const [table] = await sql`
      SELECT t.id, t.number, t.label, t.status, t.restaurant_id,
             r.name as restaurant_name, r.slug, r.primary_color, r.currency
      FROM tables t
      JOIN restaurants r ON r.id = t.restaurant_id
      WHERE r.slug = ${slug}
        AND t.number = ${parseInt(number)}
        AND r.active = true
      LIMIT 1
    `;

    if (!table) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ table });
  } catch (error) {
    console.error('GET /api/tables error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch table' },
      { status: 500 }
    );
  }
}
