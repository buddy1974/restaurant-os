import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function seed() {
  console.log('Seeding demo data...');

  // 1. Create demo restaurant
  const [restaurant] = await sql`
    INSERT INTO restaurants (name, slug, primary_color, currency)
    VALUES ('Demo Restaurant', 'demo', '#e85d04', 'EUR')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `;
  const restaurantId = restaurant.id;
  console.log('Restaurant:', restaurantId);

  // 2. Payment methods
  await sql`DELETE FROM restaurant_payment_methods WHERE restaurant_id = ${restaurantId}`;
  await sql`
    INSERT INTO restaurant_payment_methods (restaurant_id, method, enabled)
    VALUES
      (${restaurantId}, 'cash', true),
      (${restaurantId}, 'card', true)
  `;

  // 3. Tables 1–6
  for (let i = 1; i <= 6; i++) {
    await sql`
      INSERT INTO tables (restaurant_id, number, label, status)
      VALUES (${restaurantId}, ${i}, ${'Table ' + i}, 'free')
      ON CONFLICT (restaurant_id, number) DO NOTHING
    `;
  }
  console.log('Tables 1-6 created');

  // 4. Menu categories
  const [starters] = await sql`
    INSERT INTO menu_categories (restaurant_id, name, sort_order)
    VALUES (${restaurantId}, 'Starters', 1)
    RETURNING id
  `;
  const [mains] = await sql`
    INSERT INTO menu_categories (restaurant_id, name, sort_order)
    VALUES (${restaurantId}, 'Main Dishes', 2)
    RETURNING id
  `;
  const [drinks] = await sql`
    INSERT INTO menu_categories (restaurant_id, name, sort_order)
    VALUES (${restaurantId}, 'Drinks', 3)
    RETURNING id
  `;
  const [desserts] = await sql`
    INSERT INTO menu_categories (restaurant_id, name, sort_order)
    VALUES (${restaurantId}, 'Desserts', 4)
    RETURNING id
  `;
  console.log('Categories created');

  // 5. Menu items
  await sql`
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, is_popular, upsell_group)
    VALUES
      (${restaurantId}, ${starters.id}, 'Garlic Bread', 'Toasted with herb butter', 4.50, false, 'bread_sides'),
      (${restaurantId}, ${starters.id}, 'Tomato Soup', 'Creamy tomato with croutons', 5.50, true, null),
      (${restaurantId}, ${mains.id}, 'Grilled Chicken', 'With roasted vegetables', 13.50, true, 'chicken_sides'),
      (${restaurantId}, ${mains.id}, 'Margherita Pizza', 'Classic tomato and mozzarella', 11.00, true, 'pizza_drinks'),
      (${restaurantId}, ${mains.id}, 'Pasta Carbonara', 'Creamy egg and bacon', 12.00, false, null),
      (${restaurantId}, ${mains.id}, 'Beef Burger', 'With fries and coleslaw', 14.00, false, null),
      (${restaurantId}, ${drinks.id}, 'Coca Cola', '330ml can', 3.00, false, null),
      (${restaurantId}, ${drinks.id}, 'Sparkling Water', '500ml bottle', 2.50, false, null),
      (${restaurantId}, ${drinks.id}, 'Draft Beer', 'Local lager 500ml', 4.50, true, null),
      (${restaurantId}, ${drinks.id}, 'Orange Juice', 'Freshly squeezed', 3.50, false, null),
      (${restaurantId}, ${desserts.id}, 'Chocolate Cake', 'Warm with vanilla ice cream', 6.00, true, null),
      (${restaurantId}, ${desserts.id}, 'Tiramisu', 'Classic Italian dessert', 5.50, false, null)
  `;
  console.log('Menu items created');

  console.log('Seed complete.');
  console.log('Restaurant ID:', restaurantId);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
