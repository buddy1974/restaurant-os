import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  try {
    const categories = await sql`
      SELECT id, name, sort_order, active
      FROM menu_categories
      WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = ${slug})
      ORDER BY sort_order ASC
    `;

    const items = await sql`
      SELECT id, category_id, name, description, price,
             is_drink, is_popular, available, upsell_group, sort_order
      FROM menu_items
      WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = ${slug})
      ORDER BY sort_order ASC
    `;

    return NextResponse.json({ categories, items });
  } catch (error) {
    console.error('GET /api/admin/menu error:', error);
    return NextResponse.json({ error: 'Failed to fetch menu' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { slug, type, data } = await request.json();

    const [restaurant] = await sql`
      SELECT id FROM restaurants WHERE slug = ${slug}
    `;
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }
    const restaurantId = restaurant.id;

    if (type === 'category') {
      const [cat] = await sql`
        INSERT INTO menu_categories (restaurant_id, name, sort_order)
        VALUES (${restaurantId}, ${data.name}, ${data.sort_order || 0})
        RETURNING id, name, sort_order, active
      `;
      return NextResponse.json({ category: cat }, { status: 201 });
    }

    if (type === 'item') {
      const [item] = await sql`
        INSERT INTO menu_items (
          restaurant_id, category_id, name, description,
          price, is_drink, is_popular, available, upsell_group, image_url
        )
        VALUES (
          ${restaurantId}, ${data.category_id}, ${data.name},
          ${data.description || null}, ${data.price},
          ${data.is_drink || false}, ${data.is_popular || false},
          true, ${data.upsell_group || null}, ${data.image_url || null}
        )
        RETURNING id, category_id, name, description, price, is_drink, is_popular, available, image_url
      `;
      return NextResponse.json({ item }, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/admin/menu error:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { type, id, data } = await request.json();

    if (type === 'item') {
      await sql`
        UPDATE menu_items SET
          name = ${data.name},
          description = ${data.description || null},
          price = ${data.price},
          is_popular = ${data.is_popular || false},
          available = ${data.available},
          category_id = ${data.category_id},
          image_url = ${data.image_url || null}
        WHERE id = ${id}
      `;
    }

    if (type === 'toggle') {
      await sql`
        UPDATE menu_items SET available = ${data.available} WHERE id = ${id}
      `;
    }

    if (type === 'category') {
      await sql`
        UPDATE menu_categories SET name = ${data.name}, active = ${data.active} WHERE id = ${id}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/admin/menu error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    if (!id || !type) {
      return NextResponse.json({ error: 'id and type are required' }, { status: 400 });
    }

    if (type === 'item') {
      await sql`DELETE FROM menu_items WHERE id = ${id}`;
    }

    if (type === 'category') {
      await sql`DELETE FROM menu_categories WHERE id = ${id}`;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/admin/menu error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
