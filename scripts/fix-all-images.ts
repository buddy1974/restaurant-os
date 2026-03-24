import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL!);

const imageMap: Record<string, string> = {
  'Garlic Bread': 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400&h=300&fit=crop',
  'Tomato Soup': 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop',
  'Caesar Salad': 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=400&h=300&fit=crop',
  'Bruschetta': 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=400&h=300&fit=crop',
  'Chicken Wings': 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400&h=300&fit=crop',
  'Spring Rolls': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
  'Grilled Chicken': 'https://images.unsplash.com/photo-1598103442097-8b74394b95c3?w=400&h=300&fit=crop',
  'Margherita Pizza': 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop',
  'Pasta Carbonara': 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400&h=300&fit=crop',
  'Beef Burger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
  'Ribeye Steak': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop',
  'Salmon Fillet': 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&h=300&fit=crop',
  'Vegetable Risotto': 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400&h=300&fit=crop',
  'Wiener Schnitzel': 'https://images.unsplash.com/photo-1599921841143-819065a55cc6?w=400&h=300&fit=crop',
  'Coca Cola': 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=300&fit=crop',
  'Sparkling Water': 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400&h=300&fit=crop',
  'Draft Beer': 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400&h=300&fit=crop',
  'Orange Juice': 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&h=300&fit=crop',
  'Red Wine (Glass)': 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=300&fit=crop',
  'Mojito': 'https://images.unsplash.com/photo-1587223962930-cb7f31384c19?w=400&h=300&fit=crop',
  'Espresso': 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400&h=300&fit=crop',
  'Lemonade': 'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9e?w=400&h=300&fit=crop',
  'Chocolate Cake': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop',
  'Tiramisu': 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=300&fit=crop',
  'Cheesecake': 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&h=300&fit=crop',
  'Vanilla Ice Cream': 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=400&h=300&fit=crop',
  'Crème Brûlée': 'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=400&h=300&fit=crop',
  'Chocolate Brownie': 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=300&fit=crop',
  'Tilapia': 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&h=300&fit=crop',
  'Grilled Shrimp': 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400&h=300&fit=crop',
  'Calamari': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&h=300&fit=crop',
  'Lobster Bisque': 'https://images.unsplash.com/photo-1559742811-822873691df8?w=400&h=300&fit=crop',
  'Salmon Tartare': 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&h=300&fit=crop',
  'Fish & Chips': 'https://images.unsplash.com/photo-1561184969-852acaa06dce?w=400&h=300&fit=crop',
};

async function fixAll() {
  console.log('Fixing ALL menu item images...');
  let fixed = 0;
  let skipped = 0;

  for (const [name, url] of Object.entries(imageMap)) {
    await sql`UPDATE menu_items SET image_url = ${url} WHERE name = ${name}`;
    console.log(`✓ ${name}`);
    fixed++;
  }

  // Fix any remaining items with NULL image using a fallback
  const nullItems = await sql`
    SELECT id, name FROM menu_items WHERE image_url IS NULL OR image_url = ''
  `;

  for (const item of nullItems) {
    await sql`
      UPDATE menu_items
      SET image_url = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop'
      WHERE id = ${(item as { id: string }).id}
    `;
    console.log(`⚠️ Fallback image for: ${(item as { name: string }).name}`);
    skipped++;
  }

  console.log(`Done. Fixed: ${fixed}, Fallback applied: ${skipped}`);
}
fixAll().catch(console.error);
