后端代码规范（Node.js / Express / MySQL）
来源说明

本规范参考并裁剪自：

Airbnb JavaScript Style Guide（https://github.com/airbnb/javascript）

Microsoft REST API Guidelines

OWASP ASVS / Cheat Sheets（输入验证、认证、日志与错误处理）

MySQL 官方文档（索引与事务）

JavaScript 代码规范
导入顺序

Node.js 标准库

第三方库

本地模块（按层：config → db → middlewares → validators → controllers → routes）

// 标准库
import path from 'node:path';

// 第三方
import express from 'express';
import cors from 'cors';
import Joi from 'joi';

// 本地
import { pool } from './db/pool.js';
import contactsRouter from './routes/contacts.route.js';
import { errorHandler } from './middlewares/error.js';

命名约定

目录/文件：kebab-case（例：contacts.controller.js）

变量/函数：camelCase（例：normalizePhone）

类名：PascalCase（例：UserService）

常量：SCREAMING_SNAKE_CASE（例：MAX_PAGE_SIZE）

环境变量：SCREAMING_SNAKE_CASE（例：DB_HOST）

代码格式

缩进 2 空格；行宽 ≤ 100 字符

必须使用分号；const/let 代替 var

严格模式由 ES module 默认启用

禁止魔法数：提炼为常量

REST / 路由规范
资源与方法

列表：GET /api/contacts

详情：GET /api/contacts/:id（如无必要可省略）

新建：POST /api/contacts

更新：PUT /api/contacts/:id

删除：DELETE /api/contacts/:id

局部动作：PATCH /api/contacts/:id/blacklist

辅助集合：GET /api/contacts/groups

示例（带方法与注释）
// routes/contacts.route.js
import { Router } from 'express';
import { validate } from '../middlewares/validate.js';
import { contactSchema } from '../validators/contact.schema.js';
import * as ctrl from '../controllers/contacts.controller.js';

const router = Router();

router.get('/', ctrl.listContacts);                    // 列表 + 服务器端筛选
router.get('/groups', ctrl.groups);                    // 分组列表
router.post('/', validate(contactSchema), ctrl.createContact);         // 新建（upsert）
router.put('/:id', validate(contactSchema), ctrl.updateContact);       // 更新
router.delete('/:id', ctrl.deleteContact);             // 删除
router.patch('/:id/blacklist', ctrl.toggleBlacklist);  // 拉黑/取消

export default router;

错误处理与返回体
原则

使用恰当 HTTP 状态码：200/201/204/400/401/403/404/409/422/500

统一错误体结构：{ message, code?, details? }

不把内部堆栈直接返回给前端；仅记录到日志

// middlewares/error.js
export function errorHandler(err, req, res, next) { // eslint-disable-line
  console.error(err); // 生产环境建议接入日志平台
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ message: 'Phone already exists' });
  }
  if (err.isJoi) {
    return res.status(400).json({ message: 'Validation failed', details: err.details });
  }
  return res.status(500).json({ message: 'Internal Server Error' });
}

输入验证与清洗
规范

所有写操作（POST/PUT/PATCH）必须先过 Joi/自定义校验

先清洗再验证（如手机号归一化）

abortEarly:false 聚合所有错误一次返回

// validators/contact.schema.js
import Joi from 'joi';
export const contactSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  phone: Joi.string().min(5).max(32).required(),
  email: Joi.string().email().allow('', null),
  group_name: Joi.string().max(50).allow('', null),
  is_blacklisted: Joi.boolean().optional(),
  note: Joi.string().max(255).allow('', null),
});

// middlewares/validate.js
export function validate(schema) {
  return (req, res, next) => {
    if (req.body?.phone) req.body.phone = req.body.phone.replace(/[\s\-().]/g, '');
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) return res.status(400).json({ message: 'Validation failed', details: error.details });
    req.body = value;
    next();
  };
}

数据库规范（MySQL）
表与索引

必备唯一键：contacts.phone（支撑 upsert）

常用过滤字段建索引：group_name、is_blacklisted

时间字段使用 TIMESTAMP DEFAULT CURRENT_TIMESTAMP

事务与查询

写操作根据需要使用事务（批处理/多表一致）

一律参数化查询，禁止字符串拼接

避免 N+1：尽量一次查询满足展示

// db/pool.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
export const pool = mysql.createPool({
  host: process.env.DB_HOST, user: process.env.DB_USER,
  password: process.env.DB_PASS, database: process.env.DB_NAME,
  waitForConnections: true, connectionLimit: 10,
});

安全规范

CORS：明确 origin/methods/headers，允许 PATCH

不在错误体中泄露内部 SQL/Stack

.env 管理敏感信息，不提交仓库

记录安全相关操作日志（如删除、黑名单变更）

预留鉴权接口（后续可接 JWT / Session）

// app.js 中的 CORS
app.use(cors({
  origin: (origin, cb) => cb(null, true),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

序列化与输出

返回字段进行白名单控制，避免敏感数据外泄

布尔型字段统一转 0/1 或 true/false，接口保持一致

列表按稳定的顺序返回（如 ORDER BY id DESC）

// controllers/contacts.controller.js (片段)
res.json(rows.map(r => ({
  id: r.id, name: r.name, phone: r.phone, email: r.email,
  group_name: r.group_name, is_blacklisted: !!r.is_blacklisted,
  note: r.note, created_at: r.created_at,
})));

日志与可观测性

应用日志：console 开发可用，生产建议接入日志平台（时间、级别、traceId）

健康检查：GET /health 返回 { ok: true }

捕获未处理 Promise 拒绝并记录

process.on('unhandledRejection', (e) => console.error('UNHANDLED', e));

Git 提交规范

遵循 Conventional Commits：

feat: add blacklist toggle API

fix: cors allow PATCH preflight

refactor: extract phone normalizer

docs: add API section to README

一次提交聚焦一个主题；PR 说明包含动机与变更点

目录结构（建议）
StudentID_concacts_backend/
├─ .env.example
├─ package.json
├─ src/
│  ├─ app.js
│  ├─ server.js
│  ├─ db/ pool.js
│  ├─ routes/ contacts.route.js
│  ├─ controllers/ contacts.controller.js
│  ├─ validators/ contact.schema.js
│  └─ middlewares/ validate.js, error.js
└─ sql/ 001_init.sql, 004_groups_blacklist.sql
