const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// 路由导入
const authRoutes = require('./routes/auth.routes');
const nftRoutes = require('./routes/nft.routes');
const userRoutes = require('./routes/user.routes');
const galleryRoutes = require('./routes/gallery.routes');

// 初始化配置
dotenv.config();
const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 数据库连接
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// 路由配置
app.use('/api/auth', authRoutes);
app.use('/api/nft', nftRoutes);
app.use('/api/users', userRoutes);
app.use('/api/gallery', galleryRoutes);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 