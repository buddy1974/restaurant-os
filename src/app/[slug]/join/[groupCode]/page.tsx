'use client';

import React, { useEffect, useState } from 'react';

const seatEmoji: Record<string, string> = {
  APPLE: '🍎', MANGO: '🥭', BANANA: '🍌', PINEAPPLE: '🍍',
  STRAWBERRY: '🍓', ORANGE: '🍊', GRAPE: '🍇', PEACH: '🍑',
  CHERRY: '🍒', LEMON: '🍋', MELON: '🍈', KIWI: '🥝',
  PAPAYA: '🧡', LYCHEE: '🍬', GUAVA: '🍏', COCONUT: '🥥',
  BERRY: '🫐', PLUM: '🍆', FIG: '🍂', LIME: '🟢',
};

interface SessionData {
  id: string;
  table_id: string;
  restaurant_id: string;
  session_type: string;
  group_code: string;
  host_seat_id: string;
}

interface SeatData {
  id: string;
  seat_code: string;
}

export default function JoinGroupPage({
  params,
}: {
  params: Promise<{ slug: string; groupCode: string }>;
}) {
  const { slug, groupCode } = React.use(params);
  const [session, setSession] = useState<SessionData | null>(null);
  const [seat, setSeat] = useState<SeatData | null>(null);
  const [hostSeatCode, setHostSeatCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    async function joinGroup() {
      try {
        // Find session by group code
        const res = await fetch(`/api/sessions?groupCode=${groupCode}`);
        const data = await res.json();

        if (!data.session) {
          setError('Group not found. Ask the host for a valid code.');
          setLoading(false);
          return;
        }

        const activeSession = data.session as SessionData;
        setSession(activeSession);

        // Check stored seat
        const storedSeat = localStorage.getItem(`seat_group_${groupCode}`);
        if (storedSeat) {
          const parsed = JSON.parse(storedSeat) as SeatData;
          setSeat(parsed);
          setJoined(true);
          setLoading(false);

          const summaryRes = await fetch(`/api/sessions/summary?sessionId=${activeSession.id}`);
          const summaryData = await summaryRes.json();
          const hostSeat = summaryData.seats?.find(
            (s: { id: string; seat_code: string }) => s.id === summaryData.hostSeatId
          );
          if (hostSeat) setHostSeatCode(hostSeat.seat_code);
          return;
        }

        // Assign seat as guest
        const seatRes = await fetch('/api/seats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: activeSession.id, isGuest: true }),
        });
        const seatData = await seatRes.json();

        if (seatData.seat) {
          setSeat(seatData.seat as SeatData);
          localStorage.setItem(`seat_group_${groupCode}`, JSON.stringify(seatData.seat));
        }

        // Get host seat code
        const summaryRes = await fetch(`/api/sessions/summary?sessionId=${activeSession.id}`);
        const summaryData = await summaryRes.json();
        const hostSeat = summaryData.seats?.find(
          (s: { id: string; seat_code: string }) => s.id === summaryData.hostSeatId
        );
        if (hostSeat) setHostSeatCode(hostSeat.seat_code);

        setJoined(true);
      } catch {
        setError('Could not join group. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    joinGroup();
  }, [groupCode]);

  // Redirect once joined
  useEffect(() => {
    if (joined && seat && session) {
      window.location.href = `/${slug}/guest/${session.id}/${seat.id}`;
    }
  }, [joined, seat, session, slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Joining group...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-4xl mb-4">❌</p>
          <p className="font-bold text-gray-800">{error}</p>
          <p className="text-sm text-gray-400 mt-2">Ask the host to show you the group QR code</p>
        </div>
      </div>
    );
  }

  // Joining in progress — redirect happening
  if (joined && seat) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-4">{seatEmoji[seat.seat_code] || '🪑'}</p>
          <p className="font-bold text-gray-800">Welcome, {seat.seat_code}!</p>
          {hostSeatCode && (
            <p className="text-sm text-gray-400 mt-2">
              {seatEmoji[hostSeatCode] || '👑'} {hostSeatCode} is your host
            </p>
          )}
          <p className="text-sm text-gray-400 mt-4">Loading menu...</p>
        </div>
      </div>
    );
  }

  return null;
}
