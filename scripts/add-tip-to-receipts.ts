import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL!);

sql`ALTER TABLE receipts ADD COLUMN IF NOT EXISTS tip_amount NUMERIC(10,2) DEFAULT 0`.then(() => {
  console.log('tip_amount column added');
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
