import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL!);

async function expandMenu() {
  console.log('Expanding menu...');

  const [restaurant] = await sql`SELECT id FROM restaurants WHERE slug = 'demo'`;
  const restaurantId = (restaurant as { id: string }).id;

  const categories = await sql`
    SELECT id, name FROM menu_categories
    WHERE restaurant_id = ${restaurantId}
    ORDER BY sort_order ASC
  `;

  const catMap: Record<string, string> = {};
  for (const cat of categories) {
    catMap[(cat as { name: string }).name] = (cat as { id: string }).id;
  }

  // New items to add per category
  const newItems = [
    // STARTERS (already has garlic bread, tomato soup — add 4 more)
    {
      category: 'Starters',
      name: 'Caesar Salad',
      description: 'Romaine lettuce, croutons, parmesan',
      price: 8.50,
      image_url: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=400&h=300&fit=crop',
      is_popular: true,
    },
    {
      category: 'Starters',
      name: 'Bruschetta',
      description: 'Toasted bread with tomato and basil',
      price: 6.50,
      image_url: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=400&h=300&fit=crop',
      is_popular: false,
    },
    {
      category: 'Starters',
      name: 'Chicken Wings',
      description: 'Crispy wings with BBQ sauce',
      price: 9.50,
      image_url: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400&h=300&fit=crop',
      is_popular: true,
    },
    {
      category: 'Starters',
      name: 'Spring Rolls',
      description: 'Crispy vegetable spring rolls with sweet chili',
      price: 7.00,
      image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
      is_popular: false,
    },
    // MAIN DISHES (already has chicken, pizza, pasta, burger — add 4 more)
    {
      category: 'Main Dishes',
      name: 'Ribeye Steak',
      description: '250g prime beef, served with fries',
      price: 24.50,
      image_url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop',
      is_popular: true,
    },
    {
      category: 'Main Dishes',
      name: 'Salmon Fillet',
      description: 'Pan-seared salmon with lemon butter sauce',
      price: 18.00,
      image_url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&h=300&fit=crop',
      is_popular: false,
    },
    {
      category: 'Main Dishes',
      name: 'Vegetable Risotto',
      description: 'Creamy arborio rice with seasonal vegetables',
      price: 13.00,
      image_url: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400&h=300&fit=crop',
      is_popular: false,
    },
    {
      category: 'Main Dishes',
      name: 'Wiener Schnitzel',
      description: 'Classic breaded veal with potato salad',
      price: 16.50,
      image_url: 'https://images.unsplash.com/photo-1599921841143-819065a55cc6?w=400&h=300&fit=crop',
      is_popular: true,
    },
    // DRINKS (already has cola, water, beer, juice — add 4 more)
    {
      category: 'Drinks',
      name: 'Red Wine (Glass)',
      description: 'House Merlot, full-bodied',
      price: 6.50,
      image_url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=300&fit=crop',
      is_drink: true,
      is_popular: false,
    },
    {
      category: 'Drinks',
      name: 'Mojito',
      description: 'Fresh mint, lime, rum and soda',
      price: 8.50,
      image_url: 'https://images.unsplash.com/photo-1587223962930-cb7f31384c19?w=400&h=300&fit=crop',
      is_drink: true,
      is_popular: true,
    },
    {
      category: 'Drinks',
      name: 'Espresso',
      description: 'Double shot Italian espresso',
      price: 2.80,
      image_url: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400&h=300&fit=crop',
      is_drink: true,
      is_popular: false,
    },
    {
      category: 'Drinks',
      name: 'Lemonade',
      description: 'Freshly squeezed with mint',
      price: 4.00,
      image_url: 'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9e?w=400&h=300&fit=crop',
      is_drink: true,
      is_popular: false,
    },
    // DESSERTS (already has chocolate cake, tiramisu — add 4 more)
    {
      category: 'Desserts',
      name: 'Cheesecake',
      description: 'New York style with berry compote',
      price: 6.50,
      image_url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&h=300&fit=crop',
      is_popular: true,
    },
    {
      category: 'Desserts',
      name: 'Vanilla Ice Cream',
      description: 'Three scoops with wafer',
      price: 4.50,
      image_url: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=400&h=300&fit=crop',
      is_popular: false,
    },
    {
      category: 'Desserts',
      name: 'Crème Brûlée',
      description: 'Classic French vanilla custard',
      price: 7.00,
      image_url: 'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=400&h=300&fit=crop',
      is_popular: false,
    },
    {
      category: 'Desserts',
      name: 'Chocolate Brownie',
      description: 'Warm brownie with vanilla ice cream',
      price: 5.50,
      image_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=300&fit=crop',
      is_popular: true,
    },
    // SEA FOOD (already has tilapia — add 5 more)
    {
      category: 'Sea Food',
      name: 'Grilled Shrimp',
      description: 'Tiger prawns with garlic butter',
      price: 16.00,
      image_url: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400&h=300&fit=crop',
      is_popular: true,
    },
    {
      category: 'Sea Food',
      name: 'Calamari',
      description: 'Crispy fried squid with aioli',
      price: 12.50,
      image_url: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&h=300&fit=crop',
      is_popular: false,
    },
    {
      category: 'Sea Food',
      name: 'Lobster Bisque',
      description: 'Creamy lobster soup with croutons',
      price: 14.00,
      image_url: 'https://images.unsplash.com/photo-1559742811-822873691df8?w=400&h=300&fit=crop',
      is_popular: false,
    },
    {
      category: 'Sea Food',
      name: 'Salmon Tartare',
      description: 'Fresh salmon with capers and dill',
      price: 15.00,
      image_url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&h=300&fit=crop',
      is_popular: true,
    },
    {
      category: 'Sea Food',
      name: 'Fish & Chips',
      description: 'Beer battered cod with thick cut fries',
      price: 13.50,
      image_url: 'https://images.unsplash.com/photo-1561184969-852acaa06dce?w=400&h=300&fit=crop',
      is_popular: false,
    },
  ];

  let added = 0;
  for (const item of newItems) {
    const categoryId = catMap[item.category];
    if (!categoryId) {
      console.log(`⚠️ Category not found: ${item.category}`);
      continue;
    }

    // Check if item already exists
    const existing = await sql`
      SELECT id FROM menu_items
      WHERE restaurant_id = ${restaurantId} AND name = ${item.name}
    `;
    if ((existing as unknown[]).length > 0) {
      console.log(`⏭️ Already exists: ${item.name}`);
      continue;
    }

    await sql`
      INSERT INTO menu_items (
        restaurant_id, category_id, name, description, price,
        image_url, is_popular, is_drink, available, prep_time_minutes
      ) VALUES (
        ${restaurantId}, ${categoryId}, ${item.name}, ${item.description},
        ${item.price}, ${item.image_url}, ${item.is_popular || false},
        ${(item as { is_drink?: boolean }).is_drink || false}, true, 12
      )
    `;
    console.log(`✓ Added: ${item.name}`);
    added++;
  }

  console.log(`Done. Added ${added} new items.`);
}
expandMenu().catch(console.error);
