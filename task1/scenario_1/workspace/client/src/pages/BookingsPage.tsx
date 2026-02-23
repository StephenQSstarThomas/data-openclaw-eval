import React from 'react';
import { Typography } from 'antd';
import BookingList from '../components/BookingList';
import { useBookings } from '../hooks/useBookings';

const { Title } = Typography;

const BookingsPage: React.FC = () => {
  const { bookings, loading } = useBookings();

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>预约列表</Title>
      <BookingList bookings={bookings} loading={loading} />
    </div>
  );
};

export default BookingsPage;
