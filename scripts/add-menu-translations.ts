import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL!);
async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS menu_translations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      restaurant_id UUID NOT NULL,
      locale TEXT NOT NULL,
      item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
      category_id UUID REFERENCES menu_categories(id) ON DELETE CASCADE,
      translated_name TEXT NOT NULL,
      translated_description TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(restaurant_id, locale, item_id),
      UNIQUE(restaurant_id, locale, category_id)
    )
  `;
  console.log('menu_translations table created');
  process.exit(0);
}
main();
