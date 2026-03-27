import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import Anthropic from '@anthropic-ai/sdk';

const sql = neon(process.env.DATABASE_URL!);
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { slug, imageBase64, imageUrl, mediaType } = await request.json();
    if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

    // Get existing categories for this restaurant
    const categories = await sql`
      SELECT id, name FROM menu_categories
      WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = ${slug})
      ORDER BY sort_order
    `;

    const categoryList = categories
      .map((c) => `${(c as { id: string; name: string }).name} (id: ${(c as { id: string }).id})`)
      .join(', ');

    const prompt = `You are analyzing a restaurant menu. Extract ALL menu items you can see.

For each item return a JSON array with objects containing:
- name: string (item name)
- description: string (description, empty string if none)
- price: number (price as decimal, e.g. 12.50)
- category_id: string (pick the best matching category_id from this list: ${categoryList})
- is_popular: boolean (true if marked as popular/bestseller/recommended)
- is_drink: boolean (true if it's a beverage)

Return ONLY a valid JSON array. No explanation, no markdown, no backticks.
Example: [{"name":"Pizza Margherita","description":"Classic tomato","price":11.00,"category_id":"abc123","is_popular":false,"is_drink":false}]

If you cannot read the menu clearly, return an empty array: []`;

    let messageContent;
    if (imageBase64 && mediaType) {
      messageContent = [
        {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: imageBase64,
          },
        },
        { type: 'text' as const, text: prompt },
      ];
    } else if (imageUrl) {
      messageContent = [
        {
          type: 'image' as const,
          source: {
            type: 'url' as const,
            url: imageUrl,
          },
        },
        { type: 'text' as const, text: prompt },
      ];
    } else {
      return NextResponse.json({ error: 'image or URL required' }, { status: 400 });
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [{ role: 'user', content: messageContent }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '[]';

    let items;
    try {
      items = JSON.parse(text);
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      items = match ? JSON.parse(match[0]) : [];
    }

    return NextResponse.json({ ok: true, items, count: items.length });
  } catch (err) {
    console.error('[menu-import]', err);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
