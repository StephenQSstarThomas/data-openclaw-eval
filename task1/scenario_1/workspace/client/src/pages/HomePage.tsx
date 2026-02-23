import React from 'react';
import { Card, Row, Col, Typography, Button, Space } from 'antd';
import { CalendarOutlined, UnorderedListOutlined, DashboardOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph } = Typography;

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <Title>欢迎使用餐厅预约系统</Title>
        <Paragraph style={{ fontSize: 16 }}>
          轻松管理您的餐厅预约，提供便捷的在线预约体验
        </Paragraph>
      </div>

      <Row gutter={24} justify="center">
        <Col xs={24} sm={8}>
          <Card hoverable style={{ textAlign: 'center' }}
            onClick={() => navigate('/bookings')}>
            <CalendarOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            <Title level={4}>新建预约</Title>
            <Paragraph>快速创建新的餐厅预约</Paragraph>
            <Button type="primary">立即预约</Button>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card hoverable style={{ textAlign: 'center' }}
            onClick={() => navigate('/bookings')}>
            <UnorderedListOutlined style={{ fontSize: 48, color: '#52c41a' }} />
            <Title level={4}>查看预约</Title>
            <Paragraph>查看所有预约记录</Paragraph>
            <Button>查看列表</Button>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card hoverable style={{ textAlign: 'center' }}
            onClick={() => navigate('/admin')}>
            <DashboardOutlined style={{ fontSize: 48, color: '#faad14' }} />
            <Title level={4}>管理后台</Title>
            <Paragraph>管理和确认预约</Paragraph>
            <Button>进入管理</Button>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default HomePage;
