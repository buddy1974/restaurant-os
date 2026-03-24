import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log('Adding prep_time_minutes to menu_items...');
  await sql`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS prep_time_minutes INTEGER DEFAULT 10`;

  // Set realistic prep times
  await sql`UPDATE menu_items SET prep_time_minutes = 5 WHERE name ILIKE '%bread%' OR name ILIKE '%soup%'`;
  await sql`UPDATE menu_items SET prep_time_minutes = 8 WHERE name ILIKE '%salad%' OR name ILIKE '%water%' OR name ILIKE '%cola%' OR name ILIKE '%juice%' OR name ILIKE '%beer%'`;
  await sql`UPDATE menu_items SET prep_time_minutes = 15 WHERE name ILIKE '%burger%' OR name ILIKE '%pizza%' OR name ILIKE '%pasta%'`;
  await sql`UPDATE menu_items SET prep_time_minutes = 20 WHERE name ILIKE '%chicken%' OR name ILIKE '%steak%' OR name ILIKE '%fish%' OR name ILIKE '%tilapia%'`;
  await sql`UPDATE menu_items SET prep_time_minutes = 10 WHERE name ILIKE '%cake%' OR name ILIKE '%tiramisu%' OR name ILIKE '%dessert%'`;

  console.log('Done.');
}
migrate().catch(console.error);
