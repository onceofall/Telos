const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const auth = require('../middleware/auth.middleware');

// 获取登录 nonce
router.post('/nonce', AuthController.getNonce);

// 验证签名并登录
router.post('/verify', AuthController.verifySignature);

// 更新用户信息（需要认证）
router.put('/profile', auth.authenticate, AuthController.updateProfile);

module.exports = router; 