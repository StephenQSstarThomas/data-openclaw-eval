import React, { useState, useMemo } from 'react';
import {
  Table, Tag, Button, Space, Modal, Statistic, Row, Col, Card,
  message, DatePicker, Select, Typography, Popconfirm
} from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, CalendarOutlined,
  BarChartOutlined, DeleteOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { Booking } from '../types/booking';
import { api } from '../utils/api';

dayjs.extend(isoWeek);

const { Title } = Typography;
const { RangePicker } = DatePicker;

const STATUS_CONFIG = {
  pending: { color: 'orange', label: '待确认' },
  confirmed: { color: 'green', label: '已确认' },
  cancelled: { color: 'red', label: '已取消' },
};

interface AdminPanelProps {
  bookings: Booking[];
  loading: boolean;
  onRefresh: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ bookings, loading, onRefresh }) => {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  // 统计数据
  const stats = useMemo(() => {
    const today = dayjs().format('YYYY-MM-DD');
    const weekStart = dayjs().startOf('isoWeek').format('YYYY-MM-DD');
    const weekEnd = dayjs().endOf('isoWeek').format('YYYY-MM-DD');

    const todayBookings = bookings.filter(b => b.date === today);
    const weekBookings = bookings.filter(b => b.date >= weekStart && b.date <= weekEnd);

    const statusCounts = bookings.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      todayCount: todayBookings.length,
      weekCount: weekBookings.length,
      totalCount: bookings.length,
      pendingCount: statusCounts['pending'] || 0,
      confirmedCount: statusCounts['confirmed'] || 0,
      cancelledCount: statusCounts['cancelled'] || 0,
    };
  }, [bookings]);

  // 筛选后的预约列表
  const filteredBookings = useMemo(() => {
    let result = [...bookings];
    if (statusFilter) {
      result = result.filter(b => b.status === statusFilter);
    }
    if (dateRange) {
      const [start, end] = dateRange;
      result = result.filter(b =>
        b.date >= start.format('YYYY-MM-DD') && b.date <= end.format('YYYY-MM-DD')
      );
    }
    return result;
  }, [bookings, statusFilter, dateRange]);

  const handleStatusChange = async (id: string, status: 'confirmed' | 'cancelled') => {
    try {
      await api.updateBookingStatus(id, status);
      message.success(`预约已${status === 'confirmed' ? '确认' : '取消'}`);
      onRefresh();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteBooking(id);
      message.success('预约已删除');
      onRefresh();
    } catch {
      message.error('删除失败');
    }
  };

  const columns = [
    { title: '姓名', dataIndex: 'name', key: 'name', width: 100 },
    { title: '电话', dataIndex: 'phone', key: 'phone', width: 130 },
    { title: '邮箱', dataIndex: 'email', key: 'email', width: 180 },
    { title: '日期', dataIndex: 'date', key: 'date', width: 120,
      sorter: (a: Booking, b: Booking) => a.date.localeCompare(b.date) },
    { title: '时间', dataIndex: 'time', key: 'time', width: 80 },
    { title: '人数', dataIndex: 'partySize', key: 'partySize', width: 80 },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (status: Booking['status']) => {
        const config = STATUS_CONFIG[status];
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '操作', key: 'action', width: 200,
      render: (_: any, record: Booking) => (
        <Space>
          {record.status === 'pending' && (
            <>
              <Button
                type="primary" size="small" icon={<CheckCircleOutlined />}
                onClick={() => handleStatusChange(record.id, 'confirmed')}
              >确认</Button>
              <Button
                danger size="small" icon={<CloseCircleOutlined />}
                onClick={() => handleStatusChange(record.id, 'cancelled')}
              >取消</Button>
            </>
          )}
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* 统计面板 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={4}>
          <Card><Statistic title="今日预约" value={stats.todayCount} prefix={<CalendarOutlined />} /></Card>
        </Col>
        <Col span={4}>
          <Card><Statistic title="本周预约" value={stats.weekCount} prefix={<BarChartOutlined />} /></Card>
        </Col>
        <Col span={4}>
          <Card><Statistic title="总计" value={stats.totalCount} /></Card>
        </Col>
        <Col span={4}>
          <Card><Statistic title="待确认" value={stats.pendingCount} valueStyle={{ color: '#faad14' }} /></Card>
        </Col>
        <Col span={4}>
          <Card><Statistic title="已确认" value={stats.confirmedCount} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col span={4}>
          <Card><Statistic title="已取消" value={stats.cancelledCount} valueStyle={{ color: '#ff4d4f' }} /></Card>
        </Col>
      </Row>

      {/* 筛选栏 */}
      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="按状态筛选" allowClear style={{ width: 150 }}
          onChange={(v) => setStatusFilter(v)} value={statusFilter}
          options={[
            { label: '待确认', value: 'pending' },
            { label: '已确认', value: 'confirmed' },
            { label: '已取消', value: 'cancelled' },
          ]}
        />
        <RangePicker onChange={(dates) => setDateRange(dates as any)} />
        <Button onClick={onRefresh}>刷新</Button>
      </Space>

      {/* 预约表格 */}
      <Table
        columns={columns} dataSource={filteredBookings} rowKey="id"
        loading={loading} pagination={{ pageSize: 10 }}
        scroll={{ x: 1000 }}
      />
    </div>
  );
};

export default AdminPanel;
