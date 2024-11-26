import express from 'express';
import auth from '../middleware/auth.middleware.js';

const router = express.Router();

// 临时路由
router.get('/test', (req, res) => {
  res.json({ message: 'Gallery route working' });
});

export default router; 