import React from 'react';
import { Menu } from 'antd';
import { HomeOutlined, CalendarOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { key: '/', icon: <HomeOutlined />, label: '首页' },
    { key: '/bookings', icon: <CalendarOutlined />, label: '预约列表' },
    { key: '/admin', icon: <SettingOutlined />, label: '管理后台' },
  ];

  return (
    <Menu
      mode="horizontal" selectedKeys={[location.pathname]}
      onClick={({ key }) => navigate(key)}
      items={items}
      style={{ borderBottom: '2px solid #f0f0f0' }}
    />
  );
};

export default Navbar;
