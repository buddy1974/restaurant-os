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
      SELECT id, name, description, price, category_id, is_drink, is_popular
      FROM menu_items
      WHERE restaurant_id = ${restaurantId}
        AND available = true
      ORDER BY is_popular DESC
    `;

    // Get already ordered item IDs to exclude
    const orderedIds = orderedItems.map((i: { id: string }) => i.id);
    const orderedNames = orderedItems.map((i: { name: string }) => i.name).join(', ');

    // Get categories
    const categories = await sql`
      SELECT id, name FROM menu_categories
      WHERE restaurant_id = ${restaurantId}
    `;

    const categoryMap = Object.fromEntries(
      categories.map((c) => [
        (c as { id: string }).id,
        (c as { name: string }).name,
      ])
    );

    const availableItems = menuItems
      .filter((item) => !orderedIds.includes((item as { id: string }).id))
      .map((item) => ({
        id: (item as { id: string }).id,
        name: (item as { name: string }).name,
        description: (item as { description: string }).description || '',
        price: Number((item as { price: number }).price),
        category: categoryMap[(item as { category_id: string }).category_id] || 'Other',
        is_drink: (item as { is_drink: boolean }).is_drink,
      }));

    console.log('[ai-suggest] ordered:', orderedNames);
    console.log('[ai-suggest] available items count:', availableItems.length);

    if (availableItems.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    // Include exact IDs in prompt so AI can return valid references
    const prompt = `You are a friendly restaurant assistant. A customer ordered: ${orderedNames}.

Here are available items (with their exact IDs):
${availableItems.slice(0, 15).map((i) => `ID:${i.id} | ${i.name} (${i.category}) €${i.price} - ${i.description}`).join('\n')}

Pick exactly 3 items that complement what was ordered. Focus on:
- A drink if none ordered
- A dessert if no dessert ordered
- A side or starter that pairs well

You MUST use the exact ID strings from above.
Respond with ONLY this JSON, nothing else:
{"suggestions":[{"id":"EXACT_ID_HERE","name":"Item Name","price":0.00,"reason":"Short reason","emoji":"🍺"},{"id":"EXACT_ID_HERE","name":"Item Name","price":0.00,"reason":"Short reason","emoji":"🍰"},{"id":"EXACT_ID_HERE","name":"Item Name","price":0.00,"reason":"Short reason","emoji":"🥗"}]}`;

    console.log('[ai-suggest] calling Anthropic API...');

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

    console.log('[ai-suggest] Anthropic response status:', response.status);

    const data = await response.json();
    console.log('[ai-suggest] Anthropic raw response:', JSON.stringify(data).substring(0, 500));

    const text = data.content?.[0]?.text || '';
    console.log('[ai-suggest] extracted text:', text);

    if (!text) {
      console.log('[ai-suggest] no text in response');
      return NextResponse.json({ suggestions: [] });
    }

    // Clean and parse JSON
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    console.log('[ai-suggest] cleaned text:', cleaned);

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('[ai-suggest] JSON parse error:', parseErr, 'text was:', cleaned);
      return NextResponse.json({ suggestions: [] });
    }

    // Validate that returned IDs exist in the available items list
    const enriched = (parsed.suggestions || [])
      .filter((s: { id: string }) => {
        const found = availableItems.find((i) => i.id === s.id);
        if (!found) console.log('[ai-suggest] suggestion ID not found in menu:', s.id);
        return !!found;
      })
      .map((s: { id: string; name: string; reason: string; emoji: string }) => {
        const fullItem = availableItems.find((i) => i.id === s.id);
        return {
          id: s.id,
          name: fullItem?.name || s.name,
          price: fullItem?.price || 0,
          reason: s.reason,
          emoji: s.emoji || '🍽️',
          category: fullItem?.category || '',
        };
      });

    console.log('[ai-suggest] final enriched suggestions:', enriched.length);

    return NextResponse.json({ suggestions: enriched });

  } catch (error) {
    console.error('[ai-suggest] critical error:', error);
    return NextResponse.json({ suggestions: [] });
  }
}
