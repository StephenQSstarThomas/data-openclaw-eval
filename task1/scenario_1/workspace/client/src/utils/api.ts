import axios from 'axios';
import { Booking, CreateBookingDTO } from '../types/booking';

const API_BASE = 'http://localhost:3001/api';

export const api = {
  createBooking: (data: CreateBookingDTO) =>
    axios.post<Booking>(`${API_BASE}/bookings`, data),
  getBookings: () =>
    axios.get<Booking[]>(`${API_BASE}/bookings`),
  getBooking: (id: string) =>
    axios.get<Booking>(`${API_BASE}/bookings/${id}`),
  updateBookingStatus: (id: string, status: Booking['status']) =>
    axios.patch<Booking>(`${API_BASE}/bookings/${id}`, { status }),
  deleteBooking: (id: string) =>
    axios.delete(`${API_BASE}/bookings/${id}`),
};
