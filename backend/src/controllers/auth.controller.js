const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const ethers = require('ethers');
const crypto = require('crypto');

class AuthController {
  // 生成随机 nonce
  async getNonce(req, res) {
    try {
      const { address } = req.body;
      if (!address) {
        return res.status(400).json({ message: '钱包地址不能为空' });
      }

      // 生成随机 nonce
      const nonce = crypto.randomBytes(32).toString('hex');
      
      // 查找或创建用户
      let user = await User.findOne({ address: address.toLowerCase() });
      if (!user) {
        user = new User({
          address: address.toLowerCase(),
          username: `User-${address.slice(0, 6)}`,
          nonce: nonce
        });
      } else {
        user.nonce = nonce;
      }
      await user.save();

      res.json({
        message: '获取 nonce 成功',
        data: {
          nonce: nonce
        }
      });
    } catch (error) {
      res.status(500).json({
        message: '获取 nonce 失败',
        error: error.message
      });
    }
  }

  // 验证签名并登录
  async verifySignature(req, res) {
    try {
      const { address, signature } = req.body;
      if (!address || !signature) {
        return res.status(400).json({ message: '地址和签名不能为空' });
      }

      // 查找用户
      const user = await User.findOne({ address: address.toLowerCase() });
      if (!user) {
        return res.status(404).json({ message: '用户不存在' });
      }

      // 构造消息
      const message = `Welcome to OwnPicture!\n\nNonce: ${user.nonce}`;
      
      // 恢复签名地址
      const recoveredAddress = ethers.verifyMessage(message, signature);
      
      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        return res.status(401).json({ message: '签名验证失败' });
      }

      // 生成新的 nonce
      user.nonce = crypto.randomBytes(32).toString('hex');
      await user.save();

      // 生成 JWT token
      const token = jwt.sign(
        { 
          userId: user._id,
          address: user.address
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        message: '登录成功',
        data: {
          token,
          user: {
            id: user._id,
            address: user.address,
            username: user.username,
            isArtist: user.isArtist
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        message: '登录失败',
        error: error.message
      });
    }
  }

  // 更新用户信息
  async updateProfile(req, res) {
    try {
      const { username } = req.body;
      const userId = req.user.id;

      if (!username) {
        return res.status(400).json({ message: '用户名不能为空' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: '用户不存在' });
      }

      user.username = username;
      await user.save();

      res.json({
        message: '更新成功',
        data: {
          id: user._id,
          address: user.address,
          username: user.username,
          isArtist: user.isArtist
        }
      });
    } catch (error) {
      res.status(500).json({
        message: '更新失败',
        error: error.message
      });
    }
  }
}

module.exports = new AuthController(); 