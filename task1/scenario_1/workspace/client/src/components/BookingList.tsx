import React from 'react';
import { Card, Tag, List, Typography, Empty, Spin, Badge, Space, Grid } from 'antd';
import { UserOutlined, PhoneOutlined, ClockCircleOutlined, TeamOutlined, MailOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Booking } from '../types/booking';

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

const STATUS_CONFIG = {
  pending: { color: 'orange', label: '待确认' },
  confirmed: { color: 'green', label: '已确认' },
  cancelled: { color: 'red', label: '已取消' },
};

interface BookingListProps {
  bookings: Booking[];
  loading: boolean;
}

const BookingList: React.FC<BookingListProps> = ({ bookings, loading }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  if (loading) {
    return <Spin size="large" style={{ display: 'block', margin: '50px auto' }} />;
  }

  if (bookings.length === 0) {
    return <Empty description="暂无预约记录" />;
  }

  // 按日期分组
  const groupedBookings = bookings.reduce((groups, booking) => {
    const date = booking.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(booking);
    return groups;
  }, {} as Record<string, Booking[]>);

  const sortedDates = Object.keys(groupedBookings).sort();

  // 移动端卡片样式
  const mobileCardStyle: React.CSSProperties = {
    marginBottom: 8,
    borderRadius: 8,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  };

  // 桌面端卡片样式
  const desktopCardStyle: React.CSSProperties = {
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    transition: 'box-shadow 0.3s',
  };

  return (
    <div style={{ padding: isMobile ? '0 8px' : 0 }}>
      {sortedDates.map(date => (
        <div key={date} style={{ marginBottom: isMobile ? 16 : 24 }}>
          <Title
            level={isMobile ? 5 : 4}
            style={{
              borderBottom: '2px solid #1890ff',
              paddingBottom: 8,
              fontSize: isMobile ? 15 : undefined,
            }}
          >
            {dayjs(date).format(isMobile ? 'MM月DD日 ddd' : 'YYYY年MM月DD日 dddd')}
            <Badge count={groupedBookings[date].length} style={{ marginLeft: 8 }} />
          </Title>
          <List
            grid={isMobile
              ? { gutter: [0, 8], xs: 1, sm: 1 }
              : { gutter: [16, 16], md: 2, lg: 3, xl: 4 }
            }
            dataSource={groupedBookings[date]}
            renderItem={(booking) => {
              const statusInfo = STATUS_CONFIG[booking.status];
              return (
                <List.Item style={{ padding: isMobile ? '4px 0' : undefined }}>
                  <Card
                    size="small"
                    hoverable={!isMobile}
                    style={isMobile ? mobileCardStyle : desktopCardStyle}
                    extra={<Tag color={statusInfo.color}>{statusInfo.label}</Tag>}
                  >
                    <Space direction="vertical" size={isMobile ? 2 : 'small'} style={{ width: '100%' }}>
                      <Text strong style={{ fontSize: isMobile ? 14 : 15 }}>
                        <UserOutlined /> {booking.name}
                      </Text>
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                        <Text style={{ fontSize: isMobile ? 12 : 14 }}>
                          <ClockCircleOutlined /> {booking.time}
                        </Text>
                        <Text style={{ fontSize: isMobile ? 12 : 14 }}>
                          <TeamOutlined /> {booking.partySize} 人
                        </Text>
                      </div>
                      <Text style={{ fontSize: isMobile ? 12 : 14 }}>
                        <PhoneOutlined /> {booking.phone}
                      </Text>
                      {!isMobile && (
                        <Text style={{ fontSize: 13 }}>
                          <MailOutlined /> {booking.email}
                        </Text>
                      )}
                      {booking.specialRequests && (
                        <Text type="secondary" ellipsis style={{ fontSize: isMobile ? 11 : 13 }}>
                          备注: {booking.specialRequests}
                        </Text>
                      )}
                    </Space>
                  </Card>
                </List.Item>
              );
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default BookingList;
