import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// 导入路由
import authRoutes from './routes/auth.routes.js';
import nftRoutes from './routes/nft.routes.js';
import userRoutes from './routes/user.routes.js';
import galleryRoutes from './routes/gallery.routes.js';

// 初始化配置
dotenv.config();
const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 基础健康检查路由
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

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