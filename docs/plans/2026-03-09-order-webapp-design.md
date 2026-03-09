# 点单 Web App (PWA) 设计文档

## 概述

将点单系统从微信小程序改为 Web App (PWA) 形式。用户通过浏览器访问，可安装到手机桌面当 App 使用。管理后台独立页面，邮箱注册登录。

## 技术栈

- **前端/后端**: Next.js (全栈，App Router)
- **数据库**: SQLite + Prisma ORM
- **实时通知**: WebSocket (ws 库，集成在自定义 Node 服务器)
- **认证**: 管理端邮箱+密码 (bcrypt + JWT)，用户端匿名 sessionId
- **部署**: Docker 单容器
- **CSS**: Tailwind CSS
- **PWA**: next-pwa / 手动 manifest + Service Worker

## 架构

```
┌─────────────────────────────────────────┐
│        Next.js 全栈应用 (Docker)          │
│                                          │
│  ┌──────────────┐  ┌──────────────────┐ │
│  │  用户端 (SSR)  │  │  管理后台 (/admin) │ │
│  │  点单/订单     │  │  订单/商品/配置   │ │
│  └──────┬───────┘  └──────┬───────────┘ │
│         └────────┬────────┘             │
│       ┌──────────▼──────────┐           │
│       │  API Routes (/api)   │           │
│       │  + WebSocket Server  │           │
│       └──────────┬──────────┘           │
│       ┌──────────▼──────────┐           │
│       │  Prisma ORM + SQLite │           │
│       └─────────────────────┘           │
└─────────────────────────────────────────┘
```

- 单一 Docker 镜像，一个容器运行所有服务
- 自定义 Node 服务器 (`server.js`) 集成 WebSocket
- SQLite 数据库文件 mount 到 Docker Volume 持久化
- 商品图片存本地 `public/uploads/` 目录（Volume 持久化）

## 认证方案

### 用户端（顾客）
- 无需登录，游客即可浏览菜单和下单
- 首次访问自动生成 `sessionId`，存入 httpOnly cookie
- 用 sessionId 关联订单，用户可查看自己的历史订单

### 管理端
- 邮箱 + 密码注册/登录
- bcrypt 加密密码，JWT token 认证
- 首个注册账户自动成为超级管理员 (admin)
- 超级管理员可创建其他管理员 (staff)
- JWT 存 httpOnly cookie，7 天过期

## 数据模型

### User（管理员账户）

```
id          Int       @id @default(autoincrement())
email       String    @unique
password    String    // bcrypt hash
name        String
role        String    // 'admin' | 'staff'
createdAt   DateTime  @default(now())
```

### Category（商品分类）

```
id                Int       @id @default(autoincrement())
name              String
sort              Int       @default(0)
isActive          Boolean   @default(true)
processTemplateId Int?
createdAt         DateTime  @default(now())
```

### SpecTemplate（属性模板）

```
id        Int       @id @default(autoincrement())
name      String
type      String    // 'single' | 'multiple'
options   String    // JSON: [{ name, priceDelta }]
createdAt DateTime  @default(now())
```

### ProcessTemplate（制作流程模板）

```
id        Int       @id @default(autoincrement())
name      String
steps     String    // JSON: [{ name, sort }]
createdAt DateTime  @default(now())
```

### Product（商品）

```
id                Int       @id @default(autoincrement())
categoryId        Int
name              String
description       String    @default("")
price             Int       // 分为单位
imageUrl          String    @default("")
isOnSale          Boolean   @default(true)
sort              Int       @default(0)
specs             String    @default("[]")  // JSON
processTemplateId Int?
createdAt         DateTime  @default(now())
updatedAt         DateTime  @updatedAt
```

### Order（订单）

```
id            Int       @id @default(autoincrement())
orderNo       String    @unique
sessionId     String    // 匿名用户标识
items         String    // JSON: 订单商品详情（含 specs、process）
totalPrice    Int       // 分
status        String    @default("pending") // pending|confirmed|ready|completed|cancelled
estimatedTime Int?
remark        String    @default("")
createdAt     DateTime  @default(now())
confirmedAt   DateTime?
readyAt       DateTime?
completedAt   DateTime?
```

## 页面结构

### 用户端

| 路径 | 说明 |
|------|------|
| `/` | 点单页：左分类导航 + 右商品列表 + 底部购物车浮层 + 商品规格弹窗 |
| `/order/confirm` | 订单确认：商品明细、备注、提交 |
| `/order/[id]` | 订单详情：状态进度条、制作时间轴、WebSocket 实时更新 |
| `/orders` | 我的订单：按状态 Tab 筛选 |

### 管理端

| 路径 | 说明 |
|------|------|
| `/admin/login` | 管理员登录 |
| `/admin/register` | 管理员注册（首个为超级管理员） |
| `/admin` | 订单管理：实时 WebSocket 监听、接单、推进制作步骤 |
| `/admin/products` | 商品管理：列表、搜索、上下架、新增编辑 |
| `/admin/categories` | 分类管理 |
| `/admin/specs` | 属性模板管理 |
| `/admin/process` | 制作流程管理 |

## API 路由

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 管理员注册 |
| POST | `/api/auth/login` | 管理员登录 |
| POST | `/api/auth/logout` | 登出 |
| GET | `/api/auth/me` | 获取当前用户信息 |
| GET | `/api/menu` | 获取菜单（分类+商品+解析后的规格） |
| POST | `/api/orders` | 提交订单 |
| GET | `/api/orders` | 查询订单列表 |
| GET | `/api/orders/[id]` | 查询单个订单 |
| PATCH | `/api/orders/[id]/status` | 更新订单状态（管理员） |
| PATCH | `/api/orders/[id]/process` | 推进制作步骤（管理员） |
| GET/POST | `/api/admin/products` | 商品列表/创建 |
| PATCH/DELETE | `/api/admin/products/[id]` | 商品更新/删除 |
| POST | `/api/admin/products/[id]/toggle` | 商品上下架 |
| POST | `/api/upload` | 图片上传 |
| GET/POST | `/api/admin/categories` | 分类 CRUD |
| PATCH/DELETE | `/api/admin/categories/[id]` | 分类更新/删除 |
| GET/POST | `/api/admin/specs` | 属性模板 CRUD |
| PATCH/DELETE | `/api/admin/specs/[id]` | 属性模板更新/删除 |
| GET/POST | `/api/admin/process` | 制作流程 CRUD |
| PATCH/DELETE | `/api/admin/process/[id]` | 制作流程更新/删除 |

## WebSocket 事件

### 服务端 → 客户端

| 事件 | 数据 | 接收方 |
|------|------|--------|
| `new_order` | `{ order }` | 管理端 |
| `order_updated` | `{ orderId, status, items }` | 用户端（订阅了该订单的客户端） |

### 客户端 → 服务端

| 事件 | 数据 | 说明 |
|------|------|------|
| `subscribe_order` | `{ orderId }` | 用户订阅单个订单的更新 |
| `subscribe_admin` | `{ token }` | 管理端订阅所有新订单 |

## PWA 配置

- `manifest.json`: name, icons, theme_color (#FF8D4D), display: standalone
- Service Worker: 缓存静态资源和菜单数据
- 支持"添加到主屏幕"

## Docker 部署

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci && npx prisma generate && npm run build
EXPOSE 3000
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - db-data:/app/data
      - uploads:/app/public/uploads
    environment:
      - JWT_SECRET=your-secret-key
      - DATABASE_URL=file:/app/data/order.db

volumes:
  db-data:
  uploads:
```

## UI 设计规范

沿用现有小程序设计稿：
- 主色：橙色 `#FF8D4D`，背景白 `#FFFFFF`，灰 `#F2F2F7`
- 文字：主 `#1C1C1E`，辅助 `#8E8E93`
- 字体：system-ui
- 圆角：图片 `12px`，按钮全圆角，卡片 `12px`
- 交互：橙色圆形 add 按钮，底部深色毛玻璃购物车浮层，半屏弹窗
