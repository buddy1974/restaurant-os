import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

  try {
    const tables = await sql`
      SELECT t.id, t.number, t.label, t.status, t.qr_code_url
      FROM tables t
      JOIN restaurants r ON r.id = t.restaurant_id
      WHERE r.slug = ${slug}
      ORDER BY t.number ASC
    `;
    return NextResponse.json({ tables });
  } catch (error) {
    console.error('GET /api/admin/tables error:', error);
    return NextResponse.json({ error: 'Failed to fetch tables' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { slug, number, label } = await request.json();

    const [restaurant] = await sql`
      SELECT id FROM restaurants WHERE slug = ${slug}
    `;
    if (!restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });

    const [table] = await sql`
      INSERT INTO tables (restaurant_id, number, label, status)
      VALUES (${(restaurant as { id: string }).id}, ${number}, ${label || `Table ${number}`}, 'free')
      ON CONFLICT (restaurant_id, number) DO NOTHING
      RETURNING id, number, label, status
    `;

    return NextResponse.json({ table }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/tables error:', error);
    return NextResponse.json({ error: 'Failed to create table' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    await sql`DELETE FROM tables WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/tables error:', error);
    return NextResponse.json({ error: 'Failed to delete table' }, { status: 500 });
  }
}
