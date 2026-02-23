import React from 'react';
import { Layout as AntLayout } from 'antd';
import Navbar from './Navbar';

const { Header, Content, Footer } = AntLayout;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: 0 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Navbar />
        </div>
      </Header>
      <Content style={{ maxWidth: 1200, margin: '24px auto', width: '100%' }}>
        {children}
      </Content>
      <Footer style={{ textAlign: 'center' }}>
        餐厅预约系统 ©2026
      </Footer>
    </AntLayout>
  );
};

export default Layout;
