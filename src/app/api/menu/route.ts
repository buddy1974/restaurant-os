import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get('restaurantId');
  const locale = searchParams.get('locale') || 'en';

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

    // Fetch translations if locale is not English
    let translations: Record<string, { name: string; description?: string }> = {};
    if (locale !== 'en') {
      const trans = await sql`
        SELECT item_id, category_id, translated_name, translated_description
        FROM menu_translations
        WHERE restaurant_id = ${restaurantId}
          AND locale = ${locale}
      `;
      for (const t of trans) {
        if (t.item_id) translations[t.item_id as string] = { name: t.translated_name as string, description: t.translated_description as string | undefined };
        if (t.category_id) translations[t.category_id as string] = { name: t.translated_name as string };
      }
    }

    // Apply translations
    const translatedCategories = categories.map((cat) => ({
      ...cat,
      name: translations[cat.id as string]?.name || cat.name,
    }));

    const translatedItems = items.map((item) => ({
      ...item,
      name: translations[item.id as string]?.name || item.name,
      description: translations[item.id as string]?.description || item.description,
    }));

    return NextResponse.json({ categories: translatedCategories, items: translatedItems });
  } catch (error) {
    console.error('GET /api/menu error:', error);
    return NextResponse.json(
      { error: 'Failed to load menu' },
      { status: 500 }
    );
  }
}
