import { useState, useEffect, useCallback } from 'react';
import { Booking } from '../types/booking';
import { api } from '../utils/api';

export const useBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getBookings();
      setBookings(response.data);
    } catch (err) {
      setError('获取预约列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return { bookings, loading, error, refetch: fetchBookings };
};
