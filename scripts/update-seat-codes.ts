import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function update() {
  console.log('Updating seat codes to fruits...');

  await sql`DELETE FROM seat_codes`;

  await sql`
    INSERT INTO seat_codes (code) VALUES
      ('APPLE'), ('MANGO'), ('BANANA'), ('PINEAPPLE'),
      ('STRAWBERRY'), ('ORANGE'), ('GRAPE'), ('PEACH'),
      ('CHERRY'), ('LEMON'), ('MELON'), ('KIWI'),
      ('PAPAYA'), ('LYCHEE'), ('GUAVA'), ('COCONUT'),
      ('BERRY'), ('PLUM'), ('FIG'), ('LIME')
  `;

  console.log('Seat codes updated to fruits.');
}

update().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
