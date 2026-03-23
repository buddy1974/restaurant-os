import { useEffect, useState, useCallback } from 'react';

export interface SeatSummary {
  id: string;
  seat_code: string;
  joined_at: string;
  paid: boolean;
  seat_total: number;
  orders: {
    id: string;
    total: number;
    payment_status: string;
    payment_method: string;
    items: {
      id: string;
      name: string;
      price: number;
      quantity: number;
    }[];
  }[];
  items: {
    id: string;
    order_id: string;
    name: string;
    price: number;
    quantity: number;
  }[];
}

export interface SessionSummary {
  sessionId: string;
  seats: SeatSummary[];
  grandTotal: number;
  unpaidTotal: number;
  seatCount: number;
}

export function useSessionSummary(sessionId: string | null) {
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/summary?sessionId=${sessionId}`);
      if (!res.ok) throw new Error('Failed to fetch summary');
      const data = await res.json();
      setSummary(data);
    } catch {
      setError('Could not load session summary');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { summary, loading, error, refetch: fetchSummary };
}
