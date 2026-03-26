import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import Anthropic from '@anthropic-ai/sdk';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const { restaurantId, locale } = await request.json();
    if (!restaurantId || !locale || locale === 'en') {
      return NextResponse.json({ ok: true, cached: true });
    }

    // Check if already translated
    const existing = await sql`
      SELECT COUNT(*) as count FROM menu_translations
      WHERE restaurant_id = ${restaurantId} AND locale = ${locale}
    `;
    if (Number(existing[0].count) > 0) {
      return NextResponse.json({ ok: true, cached: true });
    }

    // Fetch all items and categories
    const [items, categories] = await Promise.all([
      sql`SELECT id, name, description FROM menu_items WHERE restaurant_id = ${restaurantId} AND available = true`,
      sql`SELECT id, name FROM menu_categories WHERE restaurant_id = ${restaurantId}`,
    ]);

    const LANG_NAMES: Record<string, string> = {
      de: 'German', tr: 'Turkish', fr: 'French', ar: 'Arabic',
    };
    const langName = LANG_NAMES[locale] || locale;

    const itemLines = items.map((i) =>
      `ITEM|${i.id}|${i.name}|${i.description || ''}`
    ).join('\n');
    const catLines = categories.map((c) =>
      `CAT|${c.id}|${c.name}`
    ).join('\n');

    const prompt = `Translate the following restaurant menu items to ${langName}.
Keep translations natural and appetizing. For Arabic use Modern Standard Arabic.
Return ONLY the translated lines in the exact same format, one per line.
Do not add any explanation or extra text.

${catLines}
${itemLines}`;

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const lines = text.trim().split('\n');

    for (const line of lines) {
      const parts = line.split('|');
      if (parts[0] === 'CAT' && parts.length >= 3) {
        const [, id, name] = parts;
        await sql`
          INSERT INTO menu_translations (restaurant_id, locale, category_id, translated_name)
          VALUES (${restaurantId}, ${locale}, ${id}, ${name})
          ON CONFLICT (restaurant_id, locale, category_id) DO UPDATE SET translated_name = ${name}
        `;
      } else if (parts[0] === 'ITEM' && parts.length >= 4) {
        const [, id, name, desc] = parts;
        await sql`
          INSERT INTO menu_translations (restaurant_id, locale, item_id, translated_name, translated_description)
          VALUES (${restaurantId}, ${locale}, ${id}, ${name}, ${desc || null})
          ON CONFLICT (restaurant_id, locale, item_id) DO UPDATE
          SET translated_name = ${name}, translated_description = ${desc || null}
        `;
      }
    }

    return NextResponse.json({ ok: true, cached: false, translated: lines.length });
  } catch (err) {
    console.error('[menu-translate]', err);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
