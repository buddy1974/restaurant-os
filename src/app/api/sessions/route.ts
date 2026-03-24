import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET — fetch active session for a table, or by group code
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tableId = searchParams.get('tableId');
  const groupCode = searchParams.get('groupCode');

  if (groupCode) {
    try {
      const [session] = await sql`
        SELECT id, table_id, restaurant_id, status, session_type, started_at, host_seat_id, group_code
        FROM table_sessions
        WHERE group_code = ${groupCode}
          AND status = 'active'
        LIMIT 1
      `;
      return NextResponse.json({ session: session || null });
    } catch (error) {
      console.error('GET /api/sessions (groupCode) error:', error);
      return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
    }
  }

  if (!tableId) {
    return NextResponse.json(
      { error: 'tableId or groupCode is required' },
      { status: 400 }
    );
  }

  try {
    const [session] = await sql`
      SELECT id, table_id, restaurant_id, status, session_type, host_seat_id, payment_locked_by, started_at
      FROM table_sessions
      WHERE table_id = ${tableId}
        AND status = 'active'
      ORDER BY started_at DESC
      LIMIT 1
    `;

    return NextResponse.json({ session: session || null });
  } catch (error) {
    console.error('GET /api/sessions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { sessionId, groupCode, newHostSeatId } = await request.json();

    if (groupCode !== undefined) {
      await sql`
        UPDATE table_sessions SET group_code = ${groupCode} WHERE id = ${sessionId}
      `;
    }

    if (newHostSeatId !== undefined) {
      await sql`
        UPDATE table_sessions SET host_seat_id = ${newHostSeatId} WHERE id = ${sessionId}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/sessions error:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}

// POST — create a new session for a table
export async function POST(request: NextRequest) {
  try {
    const { tableId, restaurantId, sessionType } = await request.json();

    if (!tableId || !restaurantId) {
      return NextResponse.json(
        { error: 'tableId and restaurantId are required' },
        { status: 400 }
      );
    }

    // Close any existing active sessions for this table
    await sql`
      UPDATE table_sessions
      SET status = 'closed', closed_at = now()
      WHERE table_id = ${tableId}
        AND status = 'active'
    `;

    // Create new session with session type
    const [session] = await sql`
      INSERT INTO table_sessions (table_id, restaurant_id, status, session_type)
      VALUES (${tableId}, ${restaurantId}, 'active', ${sessionType || 'individual'})
      RETURNING id, table_id, restaurant_id, status, session_type, started_at
    `;

    // Mark table as occupied
    await sql`
      UPDATE tables
      SET status = 'occupied'
      WHERE id = ${tableId}
    `;

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error('POST /api/sessions error:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
