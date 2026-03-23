import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get('restaurantId');

  if (!restaurantId) {
    return NextResponse.json(
      { error: 'restaurantId is required' },
      { status: 400 }
    );
  }

  try {
    const categories = await sql`
      SELECT id, name, sort_order
      FROM menu_categories
      WHERE restaurant_id = ${restaurantId}
        AND active = true
      ORDER BY sort_order ASC
    `;

    const items = await sql`
      SELECT id, category_id, name, description, price,
             is_drink, is_popular, available, upsell_group, image_url
      FROM menu_items
      WHERE restaurant_id = ${restaurantId}
        AND available = true
      ORDER BY sort_order ASC
    `;

    return NextResponse.json({ categories, items });
  } catch (error) {
    console.error('GET /api/menu error:', error);
    return NextResponse.json(
      { error: 'Failed to load menu' },
      { status: 500 }
    );
  }
}
