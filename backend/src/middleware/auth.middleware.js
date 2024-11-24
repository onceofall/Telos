const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const auth = {
  authenticate: async (req, res, next) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ 
          message: '请先登录' 
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user) {
        throw new Error();
      }

      req.user = user;
      next();
    } catch (error) {
      res.status(401).json({ 
        message: '认证失败' 
      });
    }
  }
};

module.exports = auth; 