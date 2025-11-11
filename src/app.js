// src/app.js
import express from 'express';
import cors from 'cors';
import 'express-async-errors';
import contactsRouter from './routes/contacts.route.js';
import { errorHandler } from './middlewares/error.js';

const app = express();

// ✅ CORS：允许 PATCH
app.use(cors({
    origin: (origin, cb) => cb(null, true),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));
app.options('*', cors());

// 解析 JSON
app.use(express.json());

// 欢迎页 & 健康检查
app.get('/', (req, res) => {
    res.type('html').send(`
    <h1>Contacts API</h1>
    <p><a href="/health">/health</a></p>
    <p><a href="/api/contacts">/api/contacts</a></p>
  `);
});
app.get('/health', (req, res) => res.json({ ok: true }));

// 业务路由
app.use('/api/contacts', contactsRouter);

// 统一错误处理
app.use(errorHandler);

export default app;
