export interface Booking {
  id: string;
  name: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  partySize: number;
  specialRequests?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
}

export interface CreateBookingDTO {
  name: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  partySize: number;
  specialRequests?: string;
}
