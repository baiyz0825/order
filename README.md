# 精品咖啡烘焙店 - 在线点单系统

基于 Next.js 构建的全栈在线点单系统，支持顾客端点单和管理端后台管理，具备实时订单通知、智能推荐、响应式布局、PWA 离线支持和完整的认证鉴权体系。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| 数据库 | SQLite + Prisma ORM |
| 样式 | Tailwind CSS 4 |
| 认证 | JWT (jsonwebtoken + bcryptjs) |
| 实时通信 | WebSocket (ws) |
| 状态管理 | React Context + useReducer |
| PWA | Service Worker + Web App Manifest |
| 语言 | TypeScript |
| 测试 | Vitest（11 个测试套件，覆盖全部 API） |
| 容器化 | Docker + Docker Compose |
| 运行时 | Node.js >= 18 |

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化数据库

```bash
npx prisma generate
npx prisma db push
```

### 3. 填充种子数据

```bash
npx prisma db seed
```

### 4. 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可访问。

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | SQLite 数据库文件路径 | `file:./data/order.db` |
| `JWT_SECRET` | JWT 签名密钥（生产环境务必修改） | `dev-secret-change-in-production` |
| `PORT` | 服务端口 | `3000` |

开发环境配置在 `.env` 文件中，生产部署时通过环境变量或 `deploy.sh --jwt-secret` 传入。

## 默认账户

### 管理员账户（B端后台）

| 邮箱 | 密码 | 角色 |
|------|------|------|
| admin@example.com | admin123 | admin（店长） |

管理后台入口：[http://localhost:3000/admin/login](http://localhost:3000/admin/login)

### 测试顾客账户（C端）

| 姓名 | 手机号 | 密码 |
|------|--------|------|
| 张小明 | 13800138001 | 123456 |
| 李咖啡 | 13800138002 | 123456 |
| 王烘焙 | 13800138003 | 123456 |

顾客登录入口：[http://localhost:3000/login](http://localhost:3000/login)

## 功能模块

### 顾客端（C端） — 8 个页面

| 页面 | 路由 | 说明 |
|------|------|------|
| 首页 | `/` | 店铺展示落地页，包含 Banner、公告、人气推荐（基于销量排序）、快捷入口 |
| 点单 | `/menu` | 左侧分类导航 + 右侧商品列表，支持分类点击滚动定位、商品规格选择、购物车 |
| 订单列表 | `/orders` | 按「进行中/已完成/已取消」分 Tab 查看历史订单，WebSocket 实时状态更新 |
| 订单详情 | `/order/[id]` | 单笔订单详情，制作进度实时追踪 |
| 确认下单 | `/order/confirm` | 购物车确认、备注填写、提交订单 |
| 个人中心 | `/profile` | 用户信息展示、我的订单入口、退出登录 |
| 登录/注册 | `/login` | 手机号+密码登录，支持新用户注册，已登录自动跳过 |
| 关于我们 | `/about` | 店铺介绍、营业时间、联系方式 |

### 管理端（B端） — 10 个页面

| 页面 | 路由 | 说明 |
|------|------|------|
| 订单管理 | `/admin` | 查看所有订单，确认订单、更新制作进度、标记完成/取消，WebSocket 实时新订单通知 |
| 商品管理 | `/admin/products` | 商品的增删改查、价格设置、图片上传、上下架管理 |
| 用户管理 | `/admin/users` | 查看所有注册用户，搜索/筛选、编辑用户角色、查看用户订单、删除用户 |
| 分类管理 | `/admin/categories` | 商品分类的增删改查、排序、启用/禁用 |
| 属性模板 | `/admin/specs` | 规格模板管理（如杯型、糖度、冰量、加料），支持单选/多选 |
| 制作流程 | `/admin/process` | 制作流程模板管理（如饮品制作、烘焙流程步骤） |
| 店铺设置 | `/admin/settings` | 基本信息、首页配置（欢迎语/公告/Banner）、关于我们 |
| 账户设置 | `/admin/account` | 管理员修改自己的名称、邮箱、密码 |
| 管理员登录 | `/admin/login` | 邮箱+密码登录 |
| 管理员注册 | `/admin/register` | 新管理员注册 |

### 人气推荐算法

首页「人气推荐」基于历史订单数据的多维度加权排序：

- **数据来源**：从有效订单（已确认/制作中/待取餐/已完成）中统计每个商品的累计销量
- **时间衰减加权**：近 7 天订单权重 ×3，近 30 天权重 ×2，更早权重 ×1
- **兜底策略**：推荐数量不足时，用其他上架商品按排序权重补齐
- **销量展示**：商品卡片左上角显示销量角标（如「15杯已售」「100+已售」）

### 实时通信（WebSocket）

通过自定义 `server.js` 在 Next.js 之上集成 WebSocket（端点 `/ws`）：

| 事件 | 方向 | 说明 |
|------|------|------|
| `subscribe_admin` | 客户端→服务端 | 管理端订阅，接收所有新订单和状态更新 |
| `subscribe_order` | 客户端→服务端 | 顾客端按 orderId 订阅单个订单状态更新 |
| `new_order` | 服务端→管理端 | 新订单创建时广播给所有管理端连接 |
| `order_update` | 服务端→双端 | 订单状态变更时通知订阅方（顾客端+管理端） |

### 认证与权限系统

**双轨认证**：

| 维度 | 顾客端 | 管理端 |
|------|--------|--------|
| 登录方式 | 手机号 + 密码 | 邮箱 + 密码 |
| Token Cookie | `user_token` | `admin_token` |
| 角色 | `customer` | `admin` / `staff` |

**安全特性**：

- **匿名会话**：未登录自动分配 `session_id` Cookie，用于购物车和临时订单归属
- **订单归属迁移**：用户注册/登录时，自动将匿名会话的历史订单关联到用户账户
- **路由守卫**（Middleware）：
  - 顾客端：未登录访问 `/orders`、`/profile`、`/order/*` 自动跳转 `/login?redirect=原路径`
  - 管理端：未登录访问 `/admin/*` 自动跳转 `/admin/login`
  - 已登录用户访问登录页自动跳转回原页面（避免重复登录）
- **API 权限控制**：
  - 所有 `/api/admin/*` 接口需 `admin_token` 鉴权，并验证用户角色为 `admin` 或 `staff`
  - 文件上传 `/api/upload` 需管理员权限
  - 订单详情接口三层所有权校验：管理员→全部可见，登录用户→仅自己的订单，匿名→仅 sessionId 匹配的订单

### 响应式布局

采用 CSS 变量驱动的多断点自适应策略，同一套代码适配手机、平板和桌面：

| 屏幕宽度 | 容器最大宽度 | 布局特性 |
|---------|-----------|---------|
| < 640px | 100%（全宽） | 手机端标准布局 |
| ≥ 640px | 480px | 居中容器 + 灰色背景 |
| ≥ 768px | 560px | 推荐商品 3 列、订单 2 列 |
| ≥ 1024px | 640px | 点单页商品 2 列网格 |
| ≥ 1280px | 720px | 更宽裕的内容展示 |

所有 fixed 定位元素（底部导航、购物车栏、弹窗等）均通过统一的 `.fixed-bar` CSS 类约束在容器宽度内。

### PWA 支持

项目支持作为 PWA（渐进式 Web 应用）安装到桌面/手机主屏幕：

- **Web App Manifest**：应用名「精品咖啡烘焙店」，独立窗口模式，竖屏锁定，主题色 `#FF8D4D`
- **Service Worker**：网络优先、缓存回退（Network First）策略，自动跳过 `/api/` 和 `/ws` 路径
- **离线支持**：离线时返回缓存页面，无缓存则返回 503
- **图标**：提供 192×192 和 512×512 两种尺寸的 PWA 图标

### 购物车

购物车采用 **React Context + useReducer** 模式，数据通过 **localStorage** 持久化：

- 支持操作：添加商品、删除商品、修改数量、清空购物车
- 相同商品 + 相同规格自动合并数量（基于 `cartId` 唯一标识）
- 页面刷新后自动恢复购物车数据
- 通过 `useCart()` Hook 对外暴露 `items`、`addToCart`、`removeFromCart`、`updateQuantity`、`clearCart`、`totalPrice`、`totalCount`

### 种子数据

执行 `npx prisma db seed` 后预填充的数据：

| 类型 | 内容 |
|------|------|
| 用户 | 1 个管理员 + 3 个测试顾客 |
| 属性模板 | 杯型（中/大/超大杯）、糖度（5档）、冰量（4档）、加料（4种） |
| 制作流程 | 饮品流程（调配→封口）、烘焙流程（备料→烘烤→装盘） |
| 分类 | 人气推荐、咖啡系列、季节限定、现烤烘焙、精致甜点、周边商品 |
| 商品 | 冰美式 ¥18、燕麦拿铁 ¥28、手冲瑰夏 ¥58、可颂 ¥16、马芬 ¥15、芝士蛋糕 ¥42 |
| 店铺设置 | 店名、副标题、营业时间、地址、联系方式、欢迎语、公告等 9 项 |
| Mock 订单 | 8 笔订单，覆盖全部 5 种状态，跨越多天 |

### 测试

项目包含 **11 个测试套件**，覆盖全部后端 API：

```bash
npm run test
```

| 测试文件 | 覆盖范围 |
|---------|---------|
| `01-auth.test.ts` | 管理员/顾客注册、登录、登出、鉴权 |
| `02-admin-categories.test.ts` | 分类 CRUD、排序、启用/禁用 |
| `03-admin-specs.test.ts` | 属性模板 CRUD |
| `04-admin-process.test.ts` | 制作流程模板 CRUD |
| `05-admin-products.test.ts` | 商品 CRUD、上下架 |
| `06-menu.test.ts` | 菜单查询、规格解析 |
| `07-orders.test.ts` | 订单创建、状态流转、权限校验 |
| `08-upload.test.ts` | 文件上传、权限校验 |
| `09-websocket.test.ts` | WebSocket 连接、订阅、广播 |
| `10-admin-users.test.ts` | 用户管理列表/详情/编辑/删除/用户订单 |
| `11-admin-account.test.ts` | 管理员账户信息获取/修改名称/邮箱/密码 |

测试在独立端口 3001 运行，使用独立的测试数据库 `test.db`，不影响开发数据。

## API 路由

### 公开接口

| 方法 | 路由 | 说明 |
|------|------|------|
| GET | `/api/menu` | 获取完整菜单（分类+商品+规格） |
| GET | `/api/settings` | 获取店铺公开设置 |
| GET | `/api/popular` | 获取人气推荐商品（支持 `?limit=N`） |

### 顾客认证

| 方法 | 路由 | 说明 |
|------|------|------|
| POST | `/api/user/register` | 顾客注册 |
| POST | `/api/user/login` | 顾客登录 |
| POST | `/api/user/logout` | 顾客登出 |
| GET | `/api/user/me` | 获取当前顾客信息 |

### 顾客订单

| 方法 | 路由 | 说明 |
|------|------|------|
| GET | `/api/orders` | 获取订单列表（支持 `?status=` 筛选） |
| POST | `/api/orders` | 创建新订单 |
| GET | `/api/orders/[id]` | 获取订单详情（含所有权校验） |
| GET | `/api/orders/[id]/process` | 获取订单制作进度 |
| PATCH | `/api/orders/[id]/status` | 更新订单状态 |

### 管理员认证

| 方法 | 路由 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 管理员注册 |
| POST | `/api/auth/login` | 管理员登录 |
| POST | `/api/auth/logout` | 管理员登出 |
| GET | `/api/auth/me` | 获取当前管理员信息 |

### 管理端接口（需 admin_token）

| 方法 | 路由 | 说明 |
|------|------|------|
| GET/POST | `/api/admin/products` | 商品列表/新增 |
| GET/PUT/DELETE | `/api/admin/products/[id]` | 商品详情/修改/删除 |
| PATCH | `/api/admin/products/[id]/toggle` | 商品上下架切换 |
| GET/POST | `/api/admin/categories` | 分类列表/新增 |
| GET/PUT/DELETE | `/api/admin/categories/[id]` | 分类详情/修改/删除 |
| GET/POST | `/api/admin/specs` | 规格模板列表/新增 |
| GET/PUT/DELETE | `/api/admin/specs/[id]` | 规格模板详情/修改/删除 |
| GET/POST | `/api/admin/process` | 流程模板列表/新增 |
| GET/PUT/DELETE | `/api/admin/process/[id]` | 流程模板详情/修改/删除 |
| GET/PUT | `/api/admin/settings` | 获取/更新店铺设置 |
| GET | `/api/admin/users` | 用户列表（支持 `?keyword=&role=&page=&pageSize=`） |
| GET/PUT/DELETE | `/api/admin/users/[id]` | 用户详情/编辑/删除 |
| GET | `/api/admin/users/[id]/orders` | 用户的订单列表 |
| GET/PUT | `/api/admin/account` | 管理员账户信息/修改（名称/邮箱/密码） |
| POST | `/api/upload` | 文件上传（图片） |

## 数据模型

### User — 用户

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int（自增） | 主键 |
| email | String? | 邮箱（管理员登录用，唯一） |
| phone | String? | 手机号（顾客登录用，唯一） |
| password | String | 加密密码 |
| name | String | 用户名 |
| role | String | 角色：`admin` / `staff` / `customer` |

### Category — 商品分类

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int | 主键 |
| name | String | 分类名称 |
| sort | Int | 排序权重（升序） |
| isActive | Boolean | 是否启用 |
| processTemplateId | Int? | 关联制作流程模板 |

### Product — 商品

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int | 主键 |
| categoryId | Int | 所属分类 |
| name | String | 商品名 |
| description | String | 描述 |
| price | Int | 价格（单位：分） |
| imageUrl | String | 图片 URL |
| isOnSale | Boolean | 是否上架 |
| sort | Int | 排序权重 |
| specs | String(JSON) | 规格配置 `[{templateId, required, overrideOptions?}]` |

### SpecTemplate — 规格模板

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int | 主键 |
| name | String | 模板名称（如"杯型"） |
| type | String | `single`（单选）/ `multiple`（多选） |
| options | String(JSON) | 选项 `[{name, priceDelta}]`（加价单位：分） |

### ProcessTemplate — 制作流程模板

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int | 主键 |
| name | String | 模板名称 |
| steps | String(JSON) | 步骤 `[{name, sort}]` |

### ShopSetting — 店铺设置

| 字段 | 类型 | 说明 |
|------|------|------|
| key | String（唯一） | 设置项键名 |
| value | String | 设置项值 |

### Order — 订单

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int | 主键 |
| orderNo | String（唯一） | 订单号 |
| sessionId | String | 匿名会话 ID |
| userId | Int? | 关联用户（登录后） |
| items | String(JSON) | 商品明细 `[{productId, productName, price, quantity, selectedSpecs}]` |
| totalPrice | Int | 总价（分） |
| status | String | `pending` / `confirmed` / `ready` / `completed` / `cancelled` |
| remark | String | 备注 |
| estimatedTime | Int? | 预计制作时间（分钟） |
| createdAt / confirmedAt / readyAt / completedAt | DateTime? | 各阶段时间戳 |

## 订单状态流转

```
pending（待确认）→ confirmed（制作中）→ ready（待取餐）→ completed（已完成）
       ↘                                                ↗
        ─────────────── cancelled（已取消）──────────────
```

## 项目结构

```
webapp/
├── prisma/
│   ├── schema.prisma          # 数据模型定义
│   ├── seed.ts                # 种子数据脚本
│   └── data/order.db          # SQLite 数据库文件
├── public/                    # 静态资源（图标、SW、上传文件）
├── server.js                  # 自定义服务器（Next.js + WebSocket）
├── deploy.sh                  # 一键部署脚本
├── entrypoint.sh              # Docker 容器入口脚本
├── Dockerfile                 # Docker 镜像构建文件
├── docker-compose.yml         # Docker Compose 编排文件
├── src/
│   ├── app/
│   │   ├── api/               # API 路由（30 个接口）
│   │   ├── admin/             # 管理端页面
│   │   ├── menu/              # 点单页
│   │   ├── order/             # 订单确认 & 详情
│   │   ├── orders/            # 订单列表
│   │   ├── profile/           # 个人中心
│   │   ├── login/             # 顾客登录
│   │   ├── about/             # 关于我们
│   │   ├── page.tsx           # 首页
│   │   ├── layout.tsx         # 根布局（App Shell）
│   │   └── globals.css        # 全局样式 & 响应式变量
│   ├── components/            # 共享组件
│   │   ├── BottomNav.tsx      # 底部导航栏
│   │   ├── CartBar.tsx        # 购物车浮层
│   │   ├── CategoryNav.tsx    # 分类侧边导航
│   │   ├── ProductCard.tsx    # 商品卡片
│   │   ├── ProductDetailModal.tsx  # 商品规格弹窗
│   │   └── Providers.tsx      # Context Provider
│   ├── lib/
│   │   ├── auth.ts            # 认证工具函数
│   │   ├── cart.ts            # 购物车状态管理
│   │   └── prisma.ts          # Prisma 客户端单例
│   └── middleware.ts          # 路由守卫中间件
├── tests/                     # API 集成测试（11 个套件）
│   ├── global-setup.ts        # 测试环境初始化
│   ├── helpers.ts             # 测试工具函数
│   └── 01~11-*.test.ts        # 测试用例文件
└── package.json
```

## 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（含 WebSocket，端口 3000） |
| `npm run build` | 构建生产版本 |
| `npm run start` | 启动生产服务器 |
| `npm run lint` | 运行 ESLint 检查 |
| `npm run test` | 运行 Vitest 测试 |
| `npx prisma studio` | 打开 Prisma 数据库可视化工具 |
| `npx prisma db seed` | 填充种子数据 |
| `npx prisma db push` | 同步数据库结构 |

## 一键部署

项目提供 `deploy.sh` 一键部署脚本，支持 **Docker 部署** 和 **本地部署** 两种模式。

### Docker 部署（推荐）

```bash
# 默认部署（端口 3000）
./deploy.sh

# 自定义端口和 JWT 密钥
./deploy.sh --port 8080 --jwt-secret your-secret-key

# 跳过种子数据
./deploy.sh --skip-seed
```

> 前提条件：已安装 [Docker](https://docs.docker.com/get-docker/) 和 Docker Compose

### 本地部署（无 Docker）

```bash
# 本地模式部署
./deploy.sh --mode local

# 自定义端口
./deploy.sh --mode local --port 8080
```

> 前提条件：Node.js >= 18

### 部署参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--mode <docker\|local>` | 部署模式 | `docker` |
| `--port <端口>` | 服务端口 | `3000` |
| `--jwt-secret <密钥>` | JWT 签名密钥 | 自动生成随机密钥 |
| `--skip-seed` | 跳过种子数据填充 | `false` |

### 部署后管理（Docker 模式）

```bash
# 查看日志
docker compose logs -f

# 停止服务
docker compose down

# 重启服务
docker compose restart

# 数据备份（SQLite 数据库）
docker cp order-app:/app/data/order.db ./backup-order.db

# 数据恢复
docker cp ./backup-order.db order-app:/app/data/order.db
docker compose restart
```

### 部署后管理（本地模式）

```bash
# 使用 PM2 管理（推荐）
npm install -g pm2
PORT=3000 JWT_SECRET=your-key pm2 start server.js --name order-app
pm2 save && pm2 startup

# 查看日志
pm2 logs order-app

# 重启
pm2 restart order-app
```
