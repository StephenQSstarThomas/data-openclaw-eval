import React from 'react';
import { Typography } from 'antd';
import AdminPanel from '../components/AdminPanel';
import { useBookings } from '../hooks/useBookings';

const { Title } = Typography;

const AdminPage: React.FC = () => {
  const { bookings, loading, refetch } = useBookings();

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>管理后台</Title>
      <AdminPanel bookings={bookings} loading={loading} onRefresh={refetch} />
    </div>
  );
};

export default AdminPage;
