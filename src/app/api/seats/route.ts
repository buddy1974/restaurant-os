import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// POST — join a session and get assigned a seat code
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Get all codes already taken in this session
    const takenCodes = await sql`
      SELECT seat_code FROM seats WHERE session_id = ${sessionId}
    `;
    const taken = takenCodes.map((r) => (r as { seat_code: string }).seat_code);

    // Get one available code not already taken
    const available = await sql`
      SELECT code FROM seat_codes
      WHERE code != ALL(${taken})
      ORDER BY random()
      LIMIT 1
    `;

    if (available.length === 0) {
      return NextResponse.json(
        { error: 'Table is full — no seat codes available' },
        { status: 409 }
      );
    }

    const seatCode = (available[0] as { code: string }).code;

    // Create the seat
    const [seat] = await sql`
      INSERT INTO seats (session_id, seat_code)
      VALUES (${sessionId}, ${seatCode})
      ON CONFLICT (session_id, seat_code) DO NOTHING
      RETURNING id, seat_code, session_id, joined_at
    `;

    return NextResponse.json({ seat }, { status: 201 });
  } catch (error) {
    console.error('POST /api/seats error:', error);
    return NextResponse.json(
      { error: 'Failed to assign seat' },
      { status: 500 }
    );
  }
}

// GET — get all seats for a session
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json(
      { error: 'sessionId is required' },
      { status: 400 }
    );
  }

  try {
    const seats = await sql`
      SELECT id, seat_code, joined_at, paid, payment_mode
      FROM seats
      WHERE session_id = ${sessionId}
      ORDER BY joined_at ASC
    `;

    return NextResponse.json({ seats });
  } catch (error) {
    console.error('GET /api/seats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch seats' },
      { status: 500 }
    );
  }
}
