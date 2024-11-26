import express from 'express';
import auth from '../middleware/auth.middleware.js';

const router = express.Router();

// 获取登录 nonce
router.post('/nonce', (req, res) => {
  // 临时返回
  res.json({ message: 'Nonce endpoint' });
});

// 验证签名
router.post('/verify', (req, res) => {
  // 临时返回
  res.json({ message: 'Verify endpoint' });
});

export default router; 