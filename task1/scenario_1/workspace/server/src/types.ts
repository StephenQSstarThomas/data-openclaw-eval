export interface Booking {
  id: string;
  name: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  party_size: number;
  special_requests: string | null;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface CreateBookingInput {
  name: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  partySize: number;
  specialRequests?: string;
}
