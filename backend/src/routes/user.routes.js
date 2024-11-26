import express from 'express';
import auth from '../middleware/auth.middleware.js';

const router = express.Router();

// 获取用户信息
router.get('/profile', auth.authenticate, (req, res) => {
  res.json({
    message: '获取成功',
    data: {
      id: req.user.id,
      address: req.user.address,
      username: req.user.username
    }
  });
});

export default router; 