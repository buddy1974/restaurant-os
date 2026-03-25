import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log('Creating receipts table...');

  await sql`
    CREATE TABLE IF NOT EXISTS receipts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      receipt_number TEXT UNIQUE NOT NULL,
      restaurant_id UUID REFERENCES restaurants(id),
      session_id UUID REFERENCES table_sessions(id),
      seat_id UUID REFERENCES seats(id),
      table_number INTEGER NOT NULL,
      seat_code TEXT,
      payment_method TEXT NOT NULL,
      payment_mode TEXT NOT NULL,
      subtotal NUMERIC(10,2) NOT NULL,
      vat_rate NUMERIC(5,2) DEFAULT 19.00,
      vat_amount NUMERIC(10,2) NOT NULL,
      total NUMERIC(10,2) NOT NULL,
      items JSONB NOT NULL,
      issued_at TIMESTAMPTZ DEFAULT now()
    )
  `;

  await sql`
    CREATE SEQUENCE IF NOT EXISTS receipt_sequence START 1
  `;

  console.log('Done.');
}
migrate().catch(console.error);
