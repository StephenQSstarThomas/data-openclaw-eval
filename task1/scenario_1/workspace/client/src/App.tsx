import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import BookingsPage from './pages/BookingsPage';
import AdminPage from './pages/AdminPage';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default App;
