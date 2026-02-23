import React, { useState } from 'react';
import { Form, Input, DatePicker, TimePicker, InputNumber, Button, message, Card } from 'antd';
import dayjs from 'dayjs';
import { api } from '../utils/api';
import { CreateBookingDTO } from '../types/booking';

const BookingForm: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const bookingData: CreateBookingDTO = {
        name: values.name,
        phone: values.phone,
        email: values.email,
        date: values.date.format('YYYY-MM-DD'),
        time: values.time.format('HH:mm'),
        partySize: values.partySize,
        specialRequests: values.specialRequests,
      };
      await api.createBooking(bookingData);
      message.success('预约成功！');
      form.resetFields();
    } catch (error) {
      message.error('预约失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const disabledDate = (current: dayjs.Dayjs) => {
    return current && current < dayjs().startOf('day');
  };

  return (
    <Card title="餐厅预约" style={{ maxWidth: 600, margin: '0 auto' }}>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
          <Input placeholder="请输入您的姓名" />
        </Form.Item>
        <Form.Item name="phone" label="电话" rules={[
          { required: true, message: '请输入电话' },
          { pattern: /^1[3-9]\d{9}$/, message: '请输入有效手机号' }
        ]}>
          <Input placeholder="请输入手机号码" />
        </Form.Item>
        <Form.Item name="email" label="邮箱" rules={[
          { required: true, message: '请输入邮箱' },
          { type: 'email', message: '请输入有效邮箱' }
        ]}>
          <Input placeholder="请输入邮箱地址" />
        </Form.Item>
        <Form.Item name="date" label="预约日期" rules={[{ required: true, message: '请选择日期' }]}>
          <DatePicker disabledDate={disabledDate} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="time" label="预约时间" rules={[{ required: true, message: '请选择时间' }]}>
          <TimePicker format="HH:mm" minuteStep={30} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="partySize" label="用餐人数" rules={[{ required: true, message: '请输入人数' }]}>
          <InputNumber min={1} max={20} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="specialRequests" label="特殊要求">
          <Input.TextArea rows={3} placeholder="如有特殊要求请在此填写（如过敏信息、座位偏好等）" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            提交预约
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default BookingForm;
