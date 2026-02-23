import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../models/database';
import { validateBooking } from '../middleware/validate';
import { Booking, CreateBookingInput } from '../types';

const router = Router();

// GET /api/bookings — 获取所有预约（支持按日期筛选）
router.get('/', (req: Request, res: Response) => {
  try {
    const { date, status } = req.query;
    let query = 'SELECT * FROM bookings';
    const conditions: string[] = [];
    const params: any[] = [];

    if (date) {
      conditions.push('date = ?');
      params.push(date);
    }
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY date ASC, time ASC';

    const bookings = db.prepare(query).all(...params);
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: '获取预约列表失败' });
  }
});

// GET /api/bookings/:id — 获取单个预约
router.get('/:id', (req: Request, res: Response) => {
  try {
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: '预约不存在' });
    }
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: '获取预约失败' });
  }
});

// POST /api/bookings — 创建预约
router.post('/', validateBooking, (req: Request, res: Response) => {
  try {
    const { name, phone, email, date, time, partySize, specialRequests } = req.body as CreateBookingInput;
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO bookings (id, name, phone, email, date, time, party_size, special_requests, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `);

    stmt.run(id, name, phone, email, date, time, partySize, specialRequests || null, now, now);

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ error: '创建预约失败' });
  }
});

// PATCH /api/bookings/:id — 更新预约状态
router.patch('/:id', (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: '无效的状态值' });
    }

    const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: '预约不存在' });
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?')
      .run(status, now, req.params.id);

    const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: '更新预约失败' });
  }
});

// DELETE /api/bookings/:id — 删除预约
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: '预约不存在' });
    }

    db.prepare('DELETE FROM bookings WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: '删除预约失败' });
  }
});

export default router;
