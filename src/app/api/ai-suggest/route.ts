import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { orderedItems, restaurantId } = await request.json();

    if (!orderedItems || orderedItems.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    // Get all available menu items
    const menuItems = await sql`
      SELECT id, name, description, price, category_id, is_drink, prep_time_minutes
      FROM menu_items
      WHERE restaurant_id = ${restaurantId}
        AND available = true
      ORDER BY is_popular DESC
    `;

    // Exclude already ordered items
    const orderedIds = orderedItems.map((i: { id: string }) => i.id);

    // Get categories
    const categories = await sql`
      SELECT id, name FROM menu_categories
      WHERE restaurant_id = ${restaurantId}
    `;

    const categoryMap = Object.fromEntries(
      categories.map((c) => [(c as { id: string }).id, (c as { name: string }).name])
    );

    const availableItems = menuItems
      .filter((item) => !orderedIds.includes((item as { id: string }).id))
      .map((item) => ({
        id: (item as { id: string }).id,
        name: (item as { name: string }).name,
        description: (item as { description: string }).description,
        price: (item as { price: number }).price,
        category: categoryMap[(item as { category_id: string }).category_id] || 'Other',
        is_drink: (item as { is_drink: boolean }).is_drink,
      }));

    const orderedNames = orderedItems.map((i: { name: string }) => i.name).join(', ');

    const prompt = `You are a restaurant upsell assistant. A customer has ordered: ${orderedNames}.

Available menu items they have NOT ordered yet:
${availableItems.map((i) => `- ${i.name} (${i.category}, €${i.price}): ${i.description || ''}`).join('\n')}

Suggest exactly 2-3 items from the available list that would complement what they ordered.
Focus on: drinks if no drink ordered, sides if no side ordered, desserts at end of meal.
Be brief and friendly.

Respond ONLY with valid JSON in this exact format, no other text:
{
  "suggestions": [
    {"id": "item-id-here", "name": "Item Name", "reason": "Short friendly reason under 8 words"},
    {"id": "item-id-here", "name": "Item Name", "reason": "Short friendly reason under 8 words"}
  ]
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '{"suggestions":[]}';

    try {
      const parsed = JSON.parse(text);
      const enriched = parsed.suggestions.map((s: { id: string; name: string; reason: string }) => {
        const fullItem = availableItems.find((i) => i.id === s.id);
        return {
          ...s,
          price: fullItem?.price || 0,
          category: fullItem?.category || '',
        };
      });
      return NextResponse.json({ suggestions: enriched });
    } catch {
      return NextResponse.json({ suggestions: [] });
    }
  } catch (error) {
    console.error('AI suggest error:', error);
    return NextResponse.json({ suggestions: [] });
  }
}
