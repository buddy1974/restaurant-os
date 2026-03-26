import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, address, password } = await request.json();

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const baseSlug = generateSlug(name);
    if (!baseSlug) {
      return NextResponse.json({ error: 'Invalid restaurant name' }, { status: 400 });
    }

    // Ensure unique slug
    const existing = await sql`SELECT slug FROM restaurants WHERE slug LIKE ${baseSlug + '%'} ORDER BY slug`;
    let slug = baseSlug;
    if (existing.length > 0) {
      const suffixes = existing.map((r) => {
        const match = r.slug.replace(baseSlug, '').replace(/^-/, '');
        return match === '' ? 0 : parseInt(match) || 0;
      });
      slug = `${baseSlug}-${Math.max(...suffixes) + 1}`;
    }

    // Create restaurant
    const [restaurant] = await sql`
      INSERT INTO restaurants (name, slug, owner_email, owner_phone, address)
      VALUES (${name}, ${slug}, ${email}, ${phone || null}, ${address || null})
      RETURNING id, slug
    `;

    // Create 6 default tables
    for (let i = 1; i <= 6; i++) {
      await sql`
        INSERT INTO tables (restaurant_id, number, label, status)
        VALUES (${restaurant.id}, ${i}, ${'Table ' + i}, 'free')
      `;
    }

    // Create default menu categories
    const categories = ['Starters', 'Main Dishes', 'Desserts', 'Drinks'];
    for (let i = 0; i < categories.length; i++) {
      await sql`
        INSERT INTO menu_categories (restaurant_id, name, sort_order)
        VALUES (${restaurant.id}, ${categories[i]}, ${i + 1})
      `;
    }

    return NextResponse.json({ ok: true, slug: restaurant.slug }, { status: 201 });
  } catch (err: unknown) {
    console.error('[register]', err);
    const message = err instanceof Error ? err.message : 'Registration failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
