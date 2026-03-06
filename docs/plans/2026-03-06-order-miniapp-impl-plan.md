# 点单微信小程序 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建一个微信原生小程序，支持用户线上点单、到店自取，商家通过管理后台管理商品和订单，实时追踪制作进度。

**Architecture:** 微信原生小程序 + 微信云开发（云函数 + 云数据库 + 云存储）。用户端和管理端在同一小程序内，通过 openId 白名单区分角色。实时通知采用云数据库 watch + 订阅消息双通道。

**Tech Stack:** 微信小程序原生框架、微信云开发、云数据库（MongoDB-like）、云函数（Node.js）、云存储

**UI 设计规范（从 docs/ui/ 提取）：**
- 主色：橙色 `#FF8D4D`，背景白 `#FFFFFF`，iOS 灰 `#F2F2F7`
- 文字：主 `#1C1C1E`，辅助 `#8E8E93`
- 字体：`-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif`
- 圆角：图片 `24rpx`，按钮 `999rpx (full)`，卡片 `24rpx`
- 交互：橙色圆形 add 按钮，底部深色毛玻璃购物车浮层，半屏弹窗
- 订单进度：蓝色调进度指示，时间轴式展示
- 管理端：橙色操作按钮，toggle 开关控制上下架

---

## Task 1: 项目初始化与基础结构

**Files:**
- Create: `miniprogram/app.js`
- Create: `miniprogram/app.json`
- Create: `miniprogram/app.wxss`
- Create: `miniprogram/sitemap.json`
- Create: `project.config.json`
- Create: `project.private.config.json`
- Create: `cloudfunctions/.gitkeep`

**Step 1: 创建小程序项目结构**

创建 `project.config.json`：

```json
{
  "miniprogramRoot": "miniprogram/",
  "cloudfunctionRoot": "cloudfunctions/",
  "setting": {
    "urlCheck": false,
    "es6": true,
    "enhance": true,
    "postcss": true,
    "preloadBackgroundData": false,
    "minified": true,
    "newFeature": true,
    "autoAudits": false,
    "coverView": true,
    "showShadowRootInWxmlPanel": true,
    "scopeDataCheck": false,
    "checkInvalidKey": true,
    "checkSiteMap": true,
    "uploadWithSourceMap": true,
    "compileHotReLoad": true,
    "babelSetting": {
      "ignore": [],
      "disablePlugins": [],
      "outputPath": ""
    }
  },
  "appid": "",
  "projectname": "order-miniapp",
  "condition": {},
  "editorSetting": {
    "tabIndent": "insertSpaces",
    "tabSize": 2
  }
}
```

**Step 2: 创建 app.json 配置 tabBar 和页面路由**

创建 `miniprogram/app.json`：

```json
{
  "cloud": true,
  "pages": [
    "pages/menu/menu",
    "pages/orders/orders",
    "pages/profile/profile",
    "pages/order-confirm/order-confirm",
    "pages/order-detail/order-detail",
    "pages/admin/orders/orders",
    "pages/admin/products/products",
    "pages/admin/specs/specs",
    "pages/admin/process/process",
    "pages/admin/categories/categories"
  ],
  "tabBar": {
    "color": "#8E8E93",
    "selectedColor": "#FF8D4D",
    "backgroundColor": "#FFFFFF",
    "borderStyle": "white",
    "list": [
      {
        "pagePath": "pages/menu/menu",
        "text": "点单",
        "iconPath": "assets/icons/menu.png",
        "selectedIconPath": "assets/icons/menu-active.png"
      },
      {
        "pagePath": "pages/orders/orders",
        "text": "订单",
        "iconPath": "assets/icons/orders.png",
        "selectedIconPath": "assets/icons/orders-active.png"
      },
      {
        "pagePath": "pages/profile/profile",
        "text": "我的",
        "iconPath": "assets/icons/profile.png",
        "selectedIconPath": "assets/icons/profile-active.png"
      }
    ]
  },
  "window": {
    "navigationBarBackgroundColor": "#FFFFFF",
    "navigationBarTitleText": "",
    "navigationBarTextStyle": "black",
    "backgroundColor": "#F2F2F7",
    "backgroundTextStyle": "dark"
  },
  "sitemapLocation": "sitemap.json",
  "style": "v2"
}
```

**Step 3: 创建全局样式 app.wxss**

```css
/* 全局 CSS 变量 */
page {
  --primary-orange: #FF8D4D;
  --ios-bg: #F2F2F7;
  --text-main: #1C1C1E;
  --text-secondary: #8E8E93;
  --text-light: #C7C7CC;
  --border-color: #E5E5EA;
  --card-radius: 24rpx;
  --btn-radius: 999rpx;
  --progress-blue: #007AFF;
  --success-green: #34C759;
  --danger-red: #FF3B30;
  --warning-orange: #FF9500;

  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
  color: var(--text-main);
  background-color: #FFFFFF;
  font-size: 28rpx;
  line-height: 1.5;
}

/* 通用工具类 */
.container {
  padding: 0 32rpx;
}

.card {
  background: #FFFFFF;
  border-radius: var(--card-radius);
  padding: 32rpx;
  margin-bottom: 24rpx;
}

.card-shadow {
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.btn-primary {
  background-color: var(--primary-orange);
  color: #FFFFFF;
  border-radius: var(--btn-radius);
  border: none;
  font-weight: 600;
  font-size: 30rpx;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
}

.btn-secondary {
  background-color: #FFFFFF;
  color: var(--text-main);
  border: 2rpx solid var(--border-color);
  border-radius: var(--btn-radius);
  font-size: 28rpx;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
}

.text-primary { color: var(--primary-orange); }
.text-secondary { color: var(--text-secondary); }
.text-price { color: var(--primary-orange); font-weight: 700; }

.flex-row { display: flex; flex-direction: row; align-items: center; }
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.flex-1 { flex: 1; }

.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

/* 半屏弹窗通用样式 */
.half-screen-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 100;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s, visibility 0.3s;
}
.half-screen-overlay.show { opacity: 1; visibility: visible; }

.half-screen-dialog {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  background: #FFFFFF;
  border-radius: 24rpx 24rpx 0 0;
  z-index: 101;
  transform: translateY(100%);
  transition: transform 0.3s ease-out;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}
.half-screen-dialog.show { transform: translateY(0); }

.dialog-handle {
  width: 72rpx;
  height: 8rpx;
  background: var(--border-color);
  border-radius: 4rpx;
  margin: 16rpx auto 0;
}
```

**Step 4: 创建 app.js 初始化云开发**

```javascript
App({
  globalData: {
    userInfo: null,
    openId: null,
    isAdmin: false,
    role: null, // 'admin' | 'staff' | null
    cart: [],   // 购物车数据
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    wx.cloud.init({
      traceUser: true,
    })
    this.login()
  },

  login() {
    wx.cloud.callFunction({
      name: 'login',
    }).then(res => {
      const { openId, isAdmin, role, nickName } = res.result
      this.globalData.openId = openId
      this.globalData.isAdmin = isAdmin
      this.globalData.role = role
      this.globalData.userInfo = { nickName }
    }).catch(err => {
      console.error('登录失败', err)
    })
  },

  // 购物车方法
  addToCart(item) {
    this.globalData.cart.push(item)
  },

  removeFromCart(index) {
    this.globalData.cart.splice(index, 1)
  },

  updateCartItemQuantity(index, quantity) {
    if (quantity <= 0) {
      this.removeFromCart(index)
    } else {
      this.globalData.cart[index].quantity = quantity
    }
  },

  clearCart() {
    this.globalData.cart = []
  },

  getCartTotal() {
    return this.globalData.cart.reduce((sum, item) => sum + item.subtotal, 0)
  },

  getCartCount() {
    return this.globalData.cart.reduce((sum, item) => sum + item.quantity, 0)
  }
})
```

**Step 5: 创建占位页面文件**

为每个页面创建最基础的 4 个文件（wxml/wxss/js/json），内容为空壳。页面列表：
- `miniprogram/pages/menu/menu`
- `miniprogram/pages/orders/orders`
- `miniprogram/pages/profile/profile`
- `miniprogram/pages/order-confirm/order-confirm`
- `miniprogram/pages/order-detail/order-detail`
- `miniprogram/pages/admin/orders/orders`
- `miniprogram/pages/admin/products/products`
- `miniprogram/pages/admin/specs/specs`
- `miniprogram/pages/admin/process/process`
- `miniprogram/pages/admin/categories/categories`

每个页面的 `.js` 文件：
```javascript
Page({
  data: {},
  onLoad() {}
})
```

每个页面的 `.wxml` 文件：
```xml
<view class="container">
  <text>页面名称</text>
</view>
```

每个页面的 `.wxss` 文件：空

每个页面的 `.json` 文件：
```json
{
  "usingComponents": {}
}
```

**Step 6: 创建 tabBar 图标占位**

创建目录 `miniprogram/assets/icons/`，放入 6 个 PNG 图标占位文件（81x81px）：
- `menu.png` / `menu-active.png`
- `orders.png` / `orders-active.png`
- `profile.png` / `profile-active.png`

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: 初始化小程序项目结构，配置 tabBar 和全局样式"
```

---

## Task 2: 云函数 - login（登录与权限）

**Files:**
- Create: `cloudfunctions/login/index.js`
- Create: `cloudfunctions/login/package.json`

**Step 1: 创建 login 云函数**

`cloudfunctions/login/package.json`:
```json
{
  "name": "login",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

`cloudfunctions/login/index.js`:
```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openId = wxContext.OPENID

  // 查询是否为管理员
  const adminResult = await db.collection('admins')
    .where({ openId })
    .limit(1)
    .get()

  const isAdmin = adminResult.data.length > 0
  const role = isAdmin ? adminResult.data[0].role : null
  const nickName = isAdmin ? adminResult.data[0].name : ''

  return {
    openId,
    isAdmin,
    role,
    nickName,
  }
}
```

**Step 2: Commit**

```bash
git add cloudfunctions/login/
git commit -m "feat: 添加 login 云函数，支持管理员白名单鉴权"
```

---

## Task 3: 云函数 - getMenu（获取菜单）

**Files:**
- Create: `cloudfunctions/getMenu/index.js`
- Create: `cloudfunctions/getMenu/package.json`

**Step 1: 创建 getMenu 云函数**

`cloudfunctions/getMenu/package.json`:
```json
{
  "name": "getMenu",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

`cloudfunctions/getMenu/index.js`:
```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  // 获取所有启用的分类（按 sort 排序）
  const categoriesRes = await db.collection('categories')
    .where({ isActive: true })
    .orderBy('sort', 'asc')
    .get()

  // 获取所有上架商品（按 sort 排序）
  const productsRes = await db.collection('products')
    .where({ isOnSale: true })
    .orderBy('sort', 'asc')
    .get()

  // 获取所有属性模板
  const specTemplatesRes = await db.collection('specTemplates')
    .get()

  // 获取所有制作流程模板
  const processTemplatesRes = await db.collection('processTemplates')
    .get()

  const specTemplatesMap = {}
  specTemplatesRes.data.forEach(t => { specTemplatesMap[t._id] = t })

  // 为每个商品解析实际可用的 specs
  const products = productsRes.data.map(product => {
    const resolvedSpecs = (product.specs || []).map(spec => {
      const template = specTemplatesMap[spec.templateId]
      if (!template) return null
      return {
        name: template.name,
        type: template.type,
        required: spec.required,
        options: spec.overrideOptions || template.options,
      }
    }).filter(Boolean)

    return {
      ...product,
      resolvedSpecs,
    }
  })

  return {
    categories: categoriesRes.data,
    products,
    processTemplates: processTemplatesRes.data,
  }
}
```

**Step 2: Commit**

```bash
git add cloudfunctions/getMenu/
git commit -m "feat: 添加 getMenu 云函数，支持属性模板解析和商品级覆盖"
```

---

## Task 4: 云函数 - submitOrder（提交订单）

**Files:**
- Create: `cloudfunctions/submitOrder/index.js`
- Create: `cloudfunctions/submitOrder/package.json`

**Step 1: 创建 submitOrder 云函数**

`cloudfunctions/submitOrder/package.json`:
```json
{
  "name": "submitOrder",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

`cloudfunctions/submitOrder/index.js`:
```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 生成订单编号：日期 + 4位流水号
async function generateOrderNo() {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')

  const countRes = await db.collection('orders')
    .where({
      createdAt: db.command.gte(new Date(today.toISOString().slice(0, 10)))
    })
    .count()

  const seq = String(countRes.total + 1).padStart(4, '0')
  return dateStr + seq
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openId = wxContext.OPENID
  const { items, remark } = event

  if (!items || items.length === 0) {
    return { success: false, error: '订单不能为空' }
  }

  // 校验商品有效性并构建订单项
  const productIds = items.map(i => i.productId)
  const productsRes = await db.collection('products')
    .where({ _id: db.command.in(productIds), isOnSale: true })
    .get()

  const productMap = {}
  productsRes.data.forEach(p => { productMap[p._id] = p })

  // 获取分类信息（用于继承 processTemplate）
  const categoryIds = [...new Set(productsRes.data.map(p => p.categoryId))]
  const categoriesRes = await db.collection('categories')
    .where({ _id: db.command.in(categoryIds) })
    .get()
  const categoryMap = {}
  categoriesRes.data.forEach(c => { categoryMap[c._id] = c })

  // 获取制作流程模板
  const processTemplatesRes = await db.collection('processTemplates').get()
  const processMap = {}
  processTemplatesRes.data.forEach(p => { processMap[p._id] = p })

  let totalPrice = 0
  const orderItems = []

  for (const item of items) {
    const product = productMap[item.productId]
    if (!product) {
      return { success: false, error: `商品 ${item.productId} 不存在或已下架` }
    }

    // 计算规格加价
    let specsDelta = 0
    const orderSpecs = (item.specs || []).map(s => {
      specsDelta += (s.priceDelta || 0)
      return { name: s.name, value: s.value, priceDelta: s.priceDelta || 0 }
    })

    const unitPrice = product.price + specsDelta
    const subtotal = unitPrice * item.quantity

    // 解析制作流程
    const processTemplateId = product.processTemplateId ||
      (categoryMap[product.categoryId] && categoryMap[product.categoryId].processTemplateId)

    let process = null
    if (processTemplateId && processMap[processTemplateId]) {
      const tpl = processMap[processTemplateId]
      process = {
        templateName: tpl.name,
        steps: tpl.steps.map(s => ({
          name: s.name,
          status: 'pending',
          updatedAt: null,
        })),
        currentStep: 0,
      }
    }

    orderItems.push({
      productId: product._id,
      productName: product.name,
      imageUrl: product.imageUrl || '',
      price: product.price,
      quantity: item.quantity,
      specs: orderSpecs,
      subtotal,
      process,
    })

    totalPrice += subtotal
  }

  const orderNo = await generateOrderNo()
  const now = new Date()

  const order = {
    orderNo,
    userId: openId,
    items: orderItems,
    totalPrice,
    status: 'pending',
    estimatedTime: null,
    remark: remark || '',
    createdAt: now,
    confirmedAt: null,
    readyAt: null,
    completedAt: null,
  }

  const addRes = await db.collection('orders').add({ data: order })

  // 尝试发送订阅消息给管理员（失败不影响下单）
  try {
    const adminsRes = await db.collection('admins').get()
    for (const admin of adminsRes.data) {
      await cloud.openapi.subscribeMessage.send({
        touser: admin.openId,
        templateId: '', // 需要在小程序后台申请模板 ID
        page: `pages/admin/orders/orders`,
        data: {
          thing1: { value: `新订单 #${orderNo}` },
          thing2: { value: orderItems.map(i => i.productName).join('、').slice(0, 20) },
          amount3: { value: `¥${(totalPrice / 100).toFixed(2)}` },
        },
      })
    }
  } catch (e) {
    console.warn('订阅消息发送失败', e)
  }

  return {
    success: true,
    orderId: addRes._id,
    orderNo,
  }
}
```

**Step 2: Commit**

```bash
git add cloudfunctions/submitOrder/
git commit -m "feat: 添加 submitOrder 云函数，含商品校验、制作流程初始化、订阅消息"
```

---

## Task 5: 云函数 - getOrders / updateOrderStatus / updateItemProcess

**Files:**
- Create: `cloudfunctions/getOrders/index.js`
- Create: `cloudfunctions/getOrders/package.json`
- Create: `cloudfunctions/updateOrderStatus/index.js`
- Create: `cloudfunctions/updateOrderStatus/package.json`
- Create: `cloudfunctions/updateItemProcess/index.js`
- Create: `cloudfunctions/updateItemProcess/package.json`

**Step 1: 创建 getOrders 云函数**

`cloudfunctions/getOrders/index.js`:
```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openId = wxContext.OPENID
  const { status, page = 1, pageSize = 20, isAdmin = false } = event

  // 管理员权限校验
  if (isAdmin) {
    const adminCheck = await db.collection('admins').where({ openId }).limit(1).get()
    if (adminCheck.data.length === 0) {
      return { success: false, error: '无管理员权限' }
    }
  }

  let query = isAdmin ? db.collection('orders') : db.collection('orders').where({ userId: openId })

  if (status) {
    if (Array.isArray(status)) {
      query = query.where({ status: db.command.in(status) })
    } else {
      query = query.where({ status })
    }
  }

  const countRes = await query.count()
  const skip = (page - 1) * pageSize
  const dataRes = await query
    .orderBy('createdAt', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get()

  return {
    success: true,
    orders: dataRes.data,
    total: countRes.total,
    page,
    pageSize,
  }
}
```

**Step 2: 创建 updateOrderStatus 云函数**

`cloudfunctions/updateOrderStatus/index.js`:
```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const VALID_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['ready', 'cancelled'],
  ready: ['completed'],
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openId = wxContext.OPENID

  // 管理员鉴权
  const adminCheck = await db.collection('admins').where({ openId }).limit(1).get()
  if (adminCheck.data.length === 0) {
    return { success: false, error: '无管理员权限' }
  }

  const { orderId, newStatus, estimatedTime } = event
  const orderRes = await db.collection('orders').doc(orderId).get()
  const order = orderRes.data

  const allowed = VALID_TRANSITIONS[order.status] || []
  if (!allowed.includes(newStatus)) {
    return { success: false, error: `不允许从 ${order.status} 转为 ${newStatus}` }
  }

  const now = new Date()
  const updateData = { status: newStatus }

  if (newStatus === 'confirmed') {
    updateData.confirmedAt = now
    if (estimatedTime) updateData.estimatedTime = estimatedTime
  } else if (newStatus === 'ready') {
    updateData.readyAt = now
  } else if (newStatus === 'completed') {
    updateData.completedAt = now
  }

  await db.collection('orders').doc(orderId).update({ data: updateData })
  return { success: true }
}
```

**Step 3: 创建 updateItemProcess 云函数**

`cloudfunctions/updateItemProcess/index.js`:
```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openId = wxContext.OPENID

  // 管理员鉴权
  const adminCheck = await db.collection('admins').where({ openId }).limit(1).get()
  if (adminCheck.data.length === 0) {
    return { success: false, error: '无管理员权限' }
  }

  const { orderId, itemIndex } = event
  const orderRes = await db.collection('orders').doc(orderId).get()
  const order = orderRes.data

  if (order.status !== 'confirmed') {
    return { success: false, error: '订单状态不正确，无法推进制作步骤' }
  }

  const item = order.items[itemIndex]
  if (!item || !item.process) {
    return { success: false, error: '该商品没有制作流程' }
  }

  const { currentStep, steps } = item.process
  if (currentStep >= steps.length) {
    return { success: false, error: '所有步骤已完成' }
  }

  // 标记当前步骤完成，推进到下一步
  const now = new Date()
  const updatedItems = [...order.items]
  updatedItems[itemIndex].process.steps[currentStep].status = 'completed'
  updatedItems[itemIndex].process.steps[currentStep].updatedAt = now

  const nextStep = currentStep + 1
  if (nextStep < steps.length) {
    updatedItems[itemIndex].process.steps[nextStep].status = 'in_progress'
    updatedItems[itemIndex].process.currentStep = nextStep
  } else {
    updatedItems[itemIndex].process.currentStep = nextStep // 超出表示全部完成
  }

  // 检查是否所有商品都制作完成
  const allDone = updatedItems.every(it => {
    if (!it.process) return true
    return it.process.currentStep >= it.process.steps.length
  })

  const updateData = { items: updatedItems }
  if (allDone) {
    updateData.status = 'ready'
    updateData.readyAt = now
  }

  await db.collection('orders').doc(orderId).update({ data: updateData })

  return { success: true, allDone }
}
```

**Step 4: 为每个云函数创建 package.json（getOrders, updateOrderStatus, updateItemProcess 格式相同）**

**Step 5: Commit**

```bash
git add cloudfunctions/getOrders/ cloudfunctions/updateOrderStatus/ cloudfunctions/updateItemProcess/
git commit -m "feat: 添加订单查询、状态流转、制作步骤推进云函数"
```

---

## Task 6: 云函数 - 管理端 CRUD（manageProducts / manageCategories / manageSpecs / manageProcess / manageAdmins）

**Files:**
- Create: `cloudfunctions/manageProducts/index.js` + `package.json`
- Create: `cloudfunctions/manageCategories/index.js` + `package.json`
- Create: `cloudfunctions/manageSpecs/index.js` + `package.json`
- Create: `cloudfunctions/manageProcess/index.js` + `package.json`
- Create: `cloudfunctions/manageAdmins/index.js` + `package.json`

**Step 1: 创建通用 CRUD 鉴权模式**

所有管理端云函数遵循相同模式：鉴权 → 根据 action 分发 → 执行操作。

`cloudfunctions/manageProducts/index.js`:
```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

async function checkAdmin(openId) {
  const res = await db.collection('admins').where({ openId }).limit(1).get()
  return res.data.length > 0
}

exports.main = async (event, context) => {
  const openId = cloud.getWXContext().OPENID
  if (!(await checkAdmin(openId))) {
    return { success: false, error: '无管理员权限' }
  }

  const { action, data } = event

  switch (action) {
    case 'list': {
      const res = await db.collection('products').orderBy('sort', 'asc').get()
      return { success: true, products: res.data }
    }
    case 'add': {
      const now = new Date()
      const res = await db.collection('products').add({
        data: { ...data, createdAt: now, updatedAt: now }
      })
      return { success: true, id: res._id }
    }
    case 'update': {
      const { id, ...updateData } = data
      await db.collection('products').doc(id).update({
        data: { ...updateData, updatedAt: new Date() }
      })
      return { success: true }
    }
    case 'delete': {
      await db.collection('products').doc(data.id).remove()
      return { success: true }
    }
    case 'toggleSale': {
      const product = await db.collection('products').doc(data.id).get()
      await db.collection('products').doc(data.id).update({
        data: { isOnSale: !product.data.isOnSale, updatedAt: new Date() }
      })
      return { success: true, isOnSale: !product.data.isOnSale }
    }
    default:
      return { success: false, error: '未知操作' }
  }
}
```

**Step 2: manageCategories（同模式）**

`cloudfunctions/manageCategories/index.js`:
```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

async function checkAdmin(openId) {
  const res = await db.collection('admins').where({ openId }).limit(1).get()
  return res.data.length > 0
}

exports.main = async (event, context) => {
  const openId = cloud.getWXContext().OPENID
  if (!(await checkAdmin(openId))) {
    return { success: false, error: '无管理员权限' }
  }

  const { action, data } = event

  switch (action) {
    case 'list': {
      const res = await db.collection('categories').orderBy('sort', 'asc').get()
      return { success: true, categories: res.data }
    }
    case 'add': {
      const res = await db.collection('categories').add({ data })
      return { success: true, id: res._id }
    }
    case 'update': {
      const { id, ...updateData } = data
      await db.collection('categories').doc(id).update({ data: updateData })
      return { success: true }
    }
    case 'delete': {
      await db.collection('categories').doc(data.id).remove()
      return { success: true }
    }
    case 'toggleActive': {
      const cat = await db.collection('categories').doc(data.id).get()
      await db.collection('categories').doc(data.id).update({
        data: { isActive: !cat.data.isActive }
      })
      return { success: true, isActive: !cat.data.isActive }
    }
    default:
      return { success: false, error: '未知操作' }
  }
}
```

**Step 3: manageSpecs**

`cloudfunctions/manageSpecs/index.js`:
```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

async function checkAdmin(openId) {
  const res = await db.collection('admins').where({ openId }).limit(1).get()
  return res.data.length > 0
}

exports.main = async (event, context) => {
  const openId = cloud.getWXContext().OPENID
  if (!(await checkAdmin(openId))) {
    return { success: false, error: '无管理员权限' }
  }

  const { action, data } = event

  switch (action) {
    case 'list': {
      const res = await db.collection('specTemplates').get()
      return { success: true, specTemplates: res.data }
    }
    case 'add': {
      const res = await db.collection('specTemplates').add({ data })
      return { success: true, id: res._id }
    }
    case 'update': {
      const { id, ...updateData } = data
      await db.collection('specTemplates').doc(id).update({ data: updateData })
      return { success: true }
    }
    case 'delete': {
      await db.collection('specTemplates').doc(data.id).remove()
      return { success: true }
    }
    default:
      return { success: false, error: '未知操作' }
  }
}
```

**Step 4: manageProcess**

`cloudfunctions/manageProcess/index.js`:
```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

async function checkAdmin(openId) {
  const res = await db.collection('admins').where({ openId }).limit(1).get()
  return res.data.length > 0
}

exports.main = async (event, context) => {
  const openId = cloud.getWXContext().OPENID
  if (!(await checkAdmin(openId))) {
    return { success: false, error: '无管理员权限' }
  }

  const { action, data } = event

  switch (action) {
    case 'list': {
      const res = await db.collection('processTemplates').get()
      return { success: true, processTemplates: res.data }
    }
    case 'add': {
      const res = await db.collection('processTemplates').add({ data })
      return { success: true, id: res._id }
    }
    case 'update': {
      const { id, ...updateData } = data
      await db.collection('processTemplates').doc(id).update({ data: updateData })
      return { success: true }
    }
    case 'delete': {
      await db.collection('processTemplates').doc(data.id).remove()
      return { success: true }
    }
    default:
      return { success: false, error: '未知操作' }
  }
}
```

**Step 5: manageAdmins（超级管理员鉴权）**

`cloudfunctions/manageAdmins/index.js`:
```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const openId = cloud.getWXContext().OPENID

  // 只有 role=admin 才能管理白名单
  const adminCheck = await db.collection('admins')
    .where({ openId, role: 'admin' })
    .limit(1).get()

  if (adminCheck.data.length === 0) {
    return { success: false, error: '仅超级管理员可操作' }
  }

  const { action, data } = event

  switch (action) {
    case 'list': {
      const res = await db.collection('admins').get()
      return { success: true, admins: res.data }
    }
    case 'add': {
      const res = await db.collection('admins').add({
        data: { ...data, createdAt: new Date() }
      })
      return { success: true, id: res._id }
    }
    case 'update': {
      const { id, ...updateData } = data
      await db.collection('admins').doc(id).update({ data: updateData })
      return { success: true }
    }
    case 'delete': {
      await db.collection('admins').doc(data.id).remove()
      return { success: true }
    }
    default:
      return { success: false, error: '未知操作' }
  }
}
```

**Step 6: 为每个云函数创建 package.json**

**Step 7: Commit**

```bash
git add cloudfunctions/manageProducts/ cloudfunctions/manageCategories/ cloudfunctions/manageSpecs/ cloudfunctions/manageProcess/ cloudfunctions/manageAdmins/
git commit -m "feat: 添加管理端 CRUD 云函数（商品/分类/属性模板/流程模板/管理员）"
```

---

## Task 7: 用户端 - 点单页（Menu Page）

**Files:**
- Modify: `miniprogram/pages/menu/menu.wxml`
- Modify: `miniprogram/pages/menu/menu.wxss`
- Modify: `miniprogram/pages/menu/menu.js`
- Modify: `miniprogram/pages/menu/menu.json`

**UI 参考：** `docs/ui/2026_03_06_order_miniapp_design.md_2/screen.png`

**Step 1: 实现 menu.js 数据加载和购物车逻辑**

```javascript
const app = getApp()

Page({
  data: {
    categories: [],
    products: [],
    activeCategory: '',
    cartCount: 0,
    cartTotal: 0,
    showProductDetail: false,
    selectedProduct: null,
    estimatedTime: 15,
    scrollToCategory: '',
  },

  onLoad() {
    this.loadMenu()
  },

  onShow() {
    this.updateCartInfo()
  },

  async loadMenu() {
    wx.showLoading({ title: '加载中' })
    try {
      const res = await wx.cloud.callFunction({ name: 'getMenu' })
      const { categories, products } = res.result
      this.setData({
        categories,
        products,
        activeCategory: categories.length > 0 ? categories[0]._id : '',
      })
    } catch (e) {
      console.error('加载菜单失败', e)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
    wx.hideLoading()
  },

  onCategoryTap(e) {
    const id = e.currentTarget.dataset.id
    this.setData({
      activeCategory: id,
      scrollToCategory: `category-${id}`,
    })
  },

  onProductTap(e) {
    const product = e.currentTarget.dataset.product
    if (product.resolvedSpecs && product.resolvedSpecs.length > 0) {
      // 有规格选择，弹出详情
      this.setData({
        showProductDetail: true,
        selectedProduct: {
          ...product,
          selectedSpecs: {},
          quantity: 1,
        },
      })
    } else {
      // 无规格，直接加购
      this.quickAdd(product)
    }
  },

  quickAdd(product) {
    const cartItem = {
      productId: product._id,
      productName: product.name,
      imageUrl: product.imageUrl,
      price: product.price,
      quantity: 1,
      specs: [],
      subtotal: product.price,
    }
    app.addToCart(cartItem)
    this.updateCartInfo()
    wx.showToast({ title: '已加入购物车', icon: 'none' })
  },

  onSpecSelect(e) {
    const { specName, option, type } = e.currentTarget.dataset
    const selectedProduct = { ...this.data.selectedProduct }
    if (type === 'single') {
      selectedProduct.selectedSpecs[specName] = option
    } else {
      // multiple 多选
      if (!selectedProduct.selectedSpecs[specName]) {
        selectedProduct.selectedSpecs[specName] = []
      }
      const arr = selectedProduct.selectedSpecs[specName]
      const idx = arr.findIndex(o => o.name === option.name)
      if (idx >= 0) {
        arr.splice(idx, 1)
      } else {
        arr.push(option)
      }
    }
    this.setData({ selectedProduct })
  },

  onQuantityChange(e) {
    const delta = e.currentTarget.dataset.delta
    const selectedProduct = { ...this.data.selectedProduct }
    selectedProduct.quantity = Math.max(1, selectedProduct.quantity + delta)
    this.setData({ selectedProduct })
  },

  onAddToCart() {
    const { selectedProduct } = this.data
    // 校验必选规格
    for (const spec of selectedProduct.resolvedSpecs) {
      if (spec.required && !selectedProduct.selectedSpecs[spec.name]) {
        wx.showToast({ title: `请选择${spec.name}`, icon: 'none' })
        return
      }
    }

    // 构建 specs 数组
    const specs = []
    let specsDelta = 0
    Object.entries(selectedProduct.selectedSpecs).forEach(([name, val]) => {
      if (Array.isArray(val)) {
        val.forEach(opt => {
          specs.push({ name, value: opt.name, priceDelta: opt.priceDelta })
          specsDelta += opt.priceDelta
        })
      } else {
        specs.push({ name, value: val.name, priceDelta: val.priceDelta })
        specsDelta += val.priceDelta
      }
    })

    const unitPrice = selectedProduct.price + specsDelta
    const cartItem = {
      productId: selectedProduct._id,
      productName: selectedProduct.name,
      imageUrl: selectedProduct.imageUrl,
      price: selectedProduct.price,
      quantity: selectedProduct.quantity,
      specs,
      subtotal: unitPrice * selectedProduct.quantity,
    }

    app.addToCart(cartItem)
    this.setData({ showProductDetail: false, selectedProduct: null })
    this.updateCartInfo()
    wx.showToast({ title: '已加入购物车', icon: 'none' })
  },

  closeProductDetail() {
    this.setData({ showProductDetail: false, selectedProduct: null })
  },

  updateCartInfo() {
    this.setData({
      cartCount: app.getCartCount(),
      cartTotal: app.getCartTotal(),
    })
  },

  goToCart() {
    if (this.data.cartCount === 0) return
    wx.navigateTo({ url: '/pages/order-confirm/order-confirm' })
  },

  onScrollToCategory(e) {
    // scroll-view 滚动时更新左侧选中分类
  },

  formatPrice(price) {
    return (price / 100).toFixed(2)
  },
})
```

**Step 2: 实现 menu.wxml**

```xml
<view class="page-menu">
  <!-- 顶部店铺信息 -->
  <view class="header">
    <view class="shop-info">
      <text class="shop-name">精品咖啡烘焙店</text>
      <view class="shop-meta">
        <text class="shop-location">距离您 280m | 专注手冲与手工烘焙</text>
      </view>
    </view>
    <view class="notification-btn">
      <text>通知</text>
    </view>
  </view>

  <!-- 主体区域：左分类 + 右商品 -->
  <view class="main-content">
    <!-- 左侧分类导航 -->
    <scroll-view class="category-nav" scroll-y>
      <view
        wx:for="{{categories}}"
        wx:key="_id"
        class="category-item {{activeCategory === item._id ? 'active' : ''}}"
        data-id="{{item._id}}"
        bindtap="onCategoryTap"
      >
        <text>{{item.name}}</text>
      </view>
    </scroll-view>

    <!-- 右侧商品列表 -->
    <scroll-view
      class="product-list"
      scroll-y
      scroll-into-view="{{scrollToCategory}}"
      scroll-with-animation
    >
      <view wx:for="{{categories}}" wx:key="_id" wx:for-item="category">
        <view class="category-title" id="category-{{category._id}}">
          <text>{{category.name}}</text>
        </view>
        <view
          wx:for="{{products}}"
          wx:key="_id"
          wx:for-item="product"
          wx:if="{{product.categoryId === category._id}}"
          class="product-card"
          data-product="{{product}}"
          bindtap="onProductTap"
        >
          <image class="product-image" src="{{product.imageUrl}}" mode="aspectFill" />
          <view class="product-info">
            <text class="product-name">{{product.name}}</text>
            <text class="product-desc line-clamp-2">{{product.description}}</text>
            <view class="product-bottom">
              <text class="product-price">¥{{product.price / 100}}</text>
              <view class="add-btn" catchtap="onProductTap" data-product="{{product}}">
                <text>+</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>

  <!-- 底部购物车浮层 -->
  <view class="cart-bar {{cartCount > 0 ? 'show' : ''}}" wx:if="{{cartCount > 0}}">
    <view class="cart-bar-inner">
      <view class="cart-left" bindtap="goToCart">
        <view class="cart-icon-wrap">
          <text class="cart-icon">🛒</text>
          <text class="cart-badge" wx:if="{{cartCount > 0}}">{{cartCount}}</text>
        </view>
        <view class="cart-price-info">
          <text class="cart-total">¥{{cartTotal / 100}}</text>
          <text class="cart-estimate">预估 {{estimatedTime}} 分钟后可取</text>
        </view>
      </view>
      <view class="cart-checkout-btn" bindtap="goToCart">
        <text>去结算</text>
      </view>
    </view>
  </view>

  <!-- 商品详情半屏弹窗 -->
  <view class="half-screen-overlay {{showProductDetail ? 'show' : ''}}" bindtap="closeProductDetail" />
  <view class="half-screen-dialog {{showProductDetail ? 'show' : ''}}">
    <view class="dialog-handle" />
    <block wx:if="{{selectedProduct}}">
      <scroll-view scroll-y class="detail-scroll">
        <!-- 商品图片 -->
        <image class="detail-image" src="{{selectedProduct.imageUrl}}" mode="aspectFill" />
        <view class="detail-close" bindtap="closeProductDetail">✕</view>

        <view class="detail-body">
          <text class="detail-name">{{selectedProduct.name}}</text>
          <text class="detail-desc">{{selectedProduct.description}}</text>

          <!-- 规格选择器 -->
          <view
            wx:for="{{selectedProduct.resolvedSpecs}}"
            wx:key="name"
            class="spec-group"
          >
            <view class="spec-title">
              <text class="spec-name">{{item.name}}</text>
              <text class="spec-hint">{{item.type === 'single' ? '(选一个)' : '(可多选)'}}</text>
            </view>
            <view class="spec-options">
              <view
                wx:for="{{item.options}}"
                wx:key="name"
                wx:for-item="option"
                class="spec-option {{selectedProduct.selectedSpecs[item.name].name === option.name || (selectedProduct.selectedSpecs[item.name] && selectedProduct.selectedSpecs[item.name].findIndex && selectedProduct.selectedSpecs[item.name].findIndex(function(o){return o.name === option.name}) >= 0) ? 'selected' : ''}}"
                data-spec-name="{{item.name}}"
                data-option="{{option}}"
                data-type="{{item.type}}"
                bindtap="onSpecSelect"
              >
                <text>{{option.name}}</text>
                <text wx:if="{{option.priceDelta > 0}}" class="option-price">+¥{{option.priceDelta / 100}}</text>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>

      <!-- 底部加购栏 -->
      <view class="detail-footer">
        <view class="quantity-control">
          <view class="qty-btn" data-delta="{{-1}}" bindtap="onQuantityChange">−</view>
          <text class="qty-num">{{selectedProduct.quantity}}</text>
          <view class="qty-btn qty-btn-add" data-delta="{{1}}" bindtap="onQuantityChange">+</view>
        </view>
        <view class="add-to-cart-btn" bindtap="onAddToCart">
          <text>加入购物车 ¥{{(selectedProduct.price + 0) / 100}}</text>
        </view>
      </view>
    </block>
  </view>
</view>
```

**Step 3: 实现 menu.wxss**

```css
.page-menu {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #FFFFFF;
}

/* 顶部 */
.header {
  padding: 24rpx 32rpx;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}
.shop-name {
  font-size: 44rpx;
  font-weight: 700;
  color: var(--text-main);
}
.shop-meta { margin-top: 8rpx; }
.shop-location {
  font-size: 22rpx;
  color: var(--text-secondary);
}
.notification-btn {
  background: var(--ios-bg);
  padding: 12rpx 24rpx;
  border-radius: var(--btn-radius);
  font-size: 24rpx;
}

/* 主体 */
.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  border-top: 1rpx solid var(--border-color);
}

/* 左侧分类 */
.category-nav {
  width: 180rpx;
  background: #F8F8F8;
  flex-shrink: 0;
}
.category-item {
  padding: 40rpx 24rpx;
  text-align: center;
  font-size: 26rpx;
  color: var(--text-secondary);
  position: relative;
}
.category-item.active {
  background: #FFFFFF;
  color: var(--primary-orange);
  font-weight: 600;
}
.category-item.active::after {
  content: '';
  position: absolute;
  left: 0;
  top: 25%;
  height: 50%;
  width: 6rpx;
  background: var(--primary-orange);
  border-radius: 0 6rpx 6rpx 0;
}

/* 右侧商品 */
.product-list {
  flex: 1;
  padding: 0 24rpx;
  padding-bottom: 200rpx;
}
.category-title {
  padding: 24rpx 0 16rpx;
  font-size: 24rpx;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 2rpx;
  position: sticky;
  top: 0;
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(10px);
  z-index: 5;
}

.product-card {
  display: flex;
  gap: 20rpx;
  padding: 24rpx 0;
}
.product-image {
  width: 180rpx;
  height: 180rpx;
  border-radius: var(--card-radius);
  flex-shrink: 0;
  background: #F5F5F5;
}
.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 4rpx 0;
}
.product-name {
  font-size: 30rpx;
  font-weight: 700;
  line-height: 1.3;
}
.product-desc {
  font-size: 22rpx;
  color: var(--text-secondary);
  margin-top: 8rpx;
}
.product-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.product-price {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--text-main);
}
.add-btn {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  background: var(--primary-orange);
  color: #FFFFFF;
  font-size: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(255, 141, 77, 0.3);
}

/* 底部购物车浮层 */
.cart-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16rpx 24rpx calc(env(safe-area-inset-bottom) + 110rpx);
  z-index: 50;
}
.cart-bar-inner {
  background: rgba(28, 28, 30, 0.95);
  backdrop-filter: blur(20px);
  border-radius: var(--btn-radius);
  height: 108rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16rpx 0 20rpx;
  box-shadow: 0 8rpx 40rpx rgba(0,0,0,0.15);
}
.cart-left {
  display: flex;
  align-items: center;
  flex: 1;
}
.cart-icon-wrap {
  position: relative;
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cart-icon { font-size: 48rpx; }
.cart-badge {
  position: absolute;
  top: 4rpx;
  right: 4rpx;
  background: var(--primary-orange);
  color: #FFFFFF;
  font-size: 20rpx;
  font-weight: 700;
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid rgba(28, 28, 30, 0.95);
}
.cart-price-info { margin-left: 16rpx; }
.cart-total {
  color: #FFFFFF;
  font-size: 34rpx;
  font-weight: 700;
}
.cart-estimate {
  color: rgba(255,255,255,0.5);
  font-size: 20rpx;
  display: block;
}
.cart-checkout-btn {
  background: var(--primary-orange);
  color: #FFFFFF;
  height: 76rpx;
  line-height: 76rpx;
  padding: 0 40rpx;
  border-radius: var(--btn-radius);
  font-weight: 700;
  font-size: 28rpx;
}

/* 商品详情弹窗 */
.detail-scroll {
  max-height: 70vh;
}
.detail-image {
  width: 100%;
  height: 500rpx;
  border-radius: 24rpx;
}
.detail-close {
  position: absolute;
  top: 32rpx;
  right: 32rpx;
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background: rgba(0,0,0,0.4);
  color: #FFF;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.detail-body { padding: 32rpx; }
.detail-name {
  font-size: 40rpx;
  font-weight: 700;
  display: block;
}
.detail-desc {
  font-size: 26rpx;
  color: var(--text-secondary);
  margin-top: 12rpx;
  display: block;
  line-height: 1.6;
}

/* 规格选择器 */
.spec-group {
  margin-top: 40rpx;
  padding-top: 32rpx;
  border-top: 1rpx solid var(--border-color);
}
.spec-title { display: flex; align-items: baseline; gap: 12rpx; }
.spec-name {
  font-size: 30rpx;
  font-weight: 700;
}
.spec-hint {
  font-size: 22rpx;
  color: var(--text-secondary);
}
.spec-options {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 20rpx;
}
.spec-option {
  padding: 16rpx 32rpx;
  border: 2rpx solid var(--border-color);
  border-radius: var(--btn-radius);
  font-size: 26rpx;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.spec-option.selected {
  border-color: var(--primary-orange);
  background: rgba(255, 141, 77, 0.08);
  color: var(--primary-orange);
}
.option-price {
  font-size: 22rpx;
  color: var(--primary-orange);
}

/* 底部加购栏 */
.detail-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx calc(env(safe-area-inset-bottom) + 24rpx);
  border-top: 1rpx solid var(--border-color);
}
.quantity-control {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.qty-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  border: 2rpx solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: var(--text-secondary);
}
.qty-btn-add {
  background: var(--primary-orange);
  border-color: var(--primary-orange);
  color: #FFFFFF;
}
.qty-num {
  font-size: 30rpx;
  font-weight: 600;
  min-width: 40rpx;
  text-align: center;
}
.add-to-cart-btn {
  background: var(--primary-orange);
  color: #FFFFFF;
  height: 80rpx;
  line-height: 80rpx;
  padding: 0 48rpx;
  border-radius: var(--btn-radius);
  font-weight: 700;
  font-size: 28rpx;
}
```

**Step 4: Commit**

```bash
git add miniprogram/pages/menu/
git commit -m "feat: 实现点单页，含分类导航、商品列表、规格选择弹窗、购物车浮层"
```

---

## Task 8: 用户端 - 订单确认页

**Files:**
- Modify: `miniprogram/pages/order-confirm/order-confirm.wxml`
- Modify: `miniprogram/pages/order-confirm/order-confirm.wxss`
- Modify: `miniprogram/pages/order-confirm/order-confirm.js`

**UI 参考：** `docs/ui/checkout_and_payment_screen/screen.png`

**Step 1: 实现 order-confirm.js**

```javascript
const app = getApp()

Page({
  data: {
    cartItems: [],
    totalPrice: 0,
    remark: '',
    submitting: false,
  },

  onLoad() {
    const cart = app.globalData.cart
    this.setData({
      cartItems: cart,
      totalPrice: app.getCartTotal(),
    })
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value })
  },

  onQuantityChange(e) {
    const { index, delta } = e.currentTarget.dataset
    const cartItems = [...this.data.cartItems]
    const newQty = cartItems[index].quantity + delta
    if (newQty <= 0) {
      cartItems.splice(index, 1)
    } else {
      cartItems[index].quantity = newQty
      const specsDelta = cartItems[index].specs.reduce((sum, s) => sum + s.priceDelta, 0)
      cartItems[index].subtotal = (cartItems[index].price + specsDelta) * newQty
    }
    app.globalData.cart = cartItems
    this.setData({
      cartItems,
      totalPrice: app.getCartTotal(),
    })
  },

  onDeleteItem(e) {
    const { index } = e.currentTarget.dataset
    const cartItems = [...this.data.cartItems]
    cartItems.splice(index, 1)
    app.globalData.cart = cartItems
    this.setData({
      cartItems,
      totalPrice: app.getCartTotal(),
    })
  },

  async onSubmitOrder() {
    if (this.data.submitting) return
    if (this.data.cartItems.length === 0) {
      wx.showToast({ title: '购物车为空', icon: 'none' })
      return
    }
    this.setData({ submitting: true })

    try {
      const items = this.data.cartItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        specs: item.specs,
      }))

      const res = await wx.cloud.callFunction({
        name: 'submitOrder',
        data: { items, remark: this.data.remark },
      })

      if (res.result.success) {
        app.clearCart()
        wx.showToast({ title: '下单成功', icon: 'success' })
        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/order-detail/order-detail?id=${res.result.orderId}`
          })
        }, 1000)
      } else {
        wx.showToast({ title: res.result.error || '下单失败', icon: 'none' })
      }
    } catch (e) {
      console.error('下单失败', e)
      wx.showToast({ title: '下单失败', icon: 'none' })
    }
    this.setData({ submitting: false })
  },
})
```

**Step 2: 实现 order-confirm.wxml 和 order-confirm.wxss**

页面结构：自取提示卡片 → 订单商品列表（含图片/名称/规格/价格/数量控制）→ 小计/总价 → 备注输入 → 到店付款提示 → 提交按钮。

样式遵循 UI 稿：白色卡片 + 橙色主按钮 + 圆角输入框。

**Step 3: Commit**

```bash
git add miniprogram/pages/order-confirm/
git commit -m "feat: 实现订单确认页，含购物车编辑、备注、提交下单"
```

---

## Task 9: 用户端 - 订单详情页（含制作进度时间轴）

**Files:**
- Modify: `miniprogram/pages/order-detail/order-detail.wxml`
- Modify: `miniprogram/pages/order-detail/order-detail.wxss`
- Modify: `miniprogram/pages/order-detail/order-detail.js`

**UI 参考：** `docs/ui/2026_03_06_order_miniapp_design.md_3/screen.png`

**Step 1: 实现 order-detail.js（含 watch 实时更新）**

```javascript
Page({
  data: {
    order: null,
    statusSteps: ['已下单', '已接单', '待取餐', '已完成'],
    currentStatusIndex: 0,
  },

  watcher: null,

  onLoad(options) {
    this.orderId = options.id
    this.loadOrder()
    this.startWatch()
  },

  onUnload() {
    if (this.watcher) {
      this.watcher.close()
    }
  },

  async loadOrder() {
    const db = wx.cloud.database()
    const res = await db.collection('orders').doc(this.orderId).get()
    this.setData({
      order: res.data,
      currentStatusIndex: this.getStatusIndex(res.data.status),
    })
  },

  startWatch() {
    const db = wx.cloud.database()
    this.watcher = db.collection('orders')
      .where({ _id: this.orderId })
      .watch({
        onChange: (snapshot) => {
          if (snapshot.docs.length > 0) {
            const order = snapshot.docs[0]
            this.setData({
              order,
              currentStatusIndex: this.getStatusIndex(order.status),
            })
          }
        },
        onError: (err) => {
          console.error('watch 失败', err)
        },
      })
  },

  getStatusIndex(status) {
    const map = { pending: 0, confirmed: 1, ready: 2, completed: 3, cancelled: -1 }
    return map[status] !== undefined ? map[status] : 0
  },

  getStepStatusClass(stepStatus) {
    if (stepStatus === 'completed') return 'step-completed'
    if (stepStatus === 'in_progress') return 'step-active'
    return 'step-pending'
  },
})
```

**Step 2: 实现 order-detail.wxml**

关键 UI 结构（参照设计稿）：
- 顶部状态图标 + "正在为您制作中" 文字 + 订单号
- 预计取餐时间卡片（左：时间，右：前面还有 N 单）
- 订单整体状态进度条（已下单 → 已接单 → 待取餐 → 已完成）
- "商品制作进度" 区域：每个商品一个卡片，内含时间轴
  - 绿色勾 = 已完成步骤 + 时间
  - 蓝色动画图标 = 进行中步骤 + 时间
  - 灰色圆圈 = 等待中步骤
- 底部：下单时间、备注信息、实付金额
- 底部按钮：联系商家 + 查看取餐码

**Step 3: 实现 order-detail.wxss**

关键样式：
- 进度条使用蓝色 `var(--progress-blue)` 而非橙色
- 时间轴：竖线连接各步骤，completed 步骤绿色勾，in_progress 蓝色脉冲动画
- 卡片圆角 `24rpx`

**Step 4: Commit**

```bash
git add miniprogram/pages/order-detail/
git commit -m "feat: 实现订单详情页，含状态进度条、商品制作时间轴、watch 实时更新"
```

---

## Task 10: 用户端 - 我的订单页

**Files:**
- Modify: `miniprogram/pages/orders/orders.wxml`
- Modify: `miniprogram/pages/orders/orders.wxss`
- Modify: `miniprogram/pages/orders/orders.js`

**UI 参考：** `docs/ui/user_order_history_list/screen.png`

**Step 1: 实现 orders.js（分 Tab 加载）**

```javascript
Page({
  data: {
    tabs: [
      { key: 'processing', label: '进行中', status: ['pending', 'confirmed', 'ready'] },
      { key: 'completed', label: '已完成', status: ['completed'] },
      { key: 'cancelled', label: '已取消', status: ['cancelled'] },
    ],
    activeTab: 0,
    orders: [],
    loading: false,
    noMore: false,
    page: 1,
  },

  onLoad() {
    this.loadOrders()
  },

  onShow() {
    this.setData({ page: 1, orders: [], noMore: false })
    this.loadOrders()
  },

  onTabChange(e) {
    const index = e.currentTarget.dataset.index
    this.setData({ activeTab: index, page: 1, orders: [], noMore: false })
    this.loadOrders()
  },

  async loadOrders() {
    if (this.data.loading || this.data.noMore) return
    this.setData({ loading: true })

    const tab = this.data.tabs[this.data.activeTab]
    try {
      const res = await wx.cloud.callFunction({
        name: 'getOrders',
        data: {
          status: tab.status,
          page: this.data.page,
          pageSize: 20,
        },
      })
      const newOrders = res.result.orders
      this.setData({
        orders: this.data.page === 1 ? newOrders : [...this.data.orders, ...newOrders],
        noMore: newOrders.length < 20,
        page: this.data.page + 1,
      })
    } catch (e) {
      console.error('获取订单失败', e)
    }
    this.setData({ loading: false })
  },

  onReachBottom() {
    this.loadOrders()
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${id}` })
  },

  getStatusText(status) {
    const map = {
      pending: '待确认', confirmed: '制作中', ready: '待取餐',
      completed: '已完成', cancelled: '已取消'
    }
    return map[status] || status
  },
})
```

**Step 2: 实现 wxml 和 wxss**

按 UI 稿：Tab 导航（All/Processing/Completed/Cancelled）→ 卡片式订单列表（店铺名+日期+状态标签+商品摘要+价格+操作按钮）。

**Step 3: Commit**

```bash
git add miniprogram/pages/orders/
git commit -m "feat: 实现我的订单页，含状态 Tab 筛选、分页加载、跳转详情"
```

---

## Task 11: 用户端 - 个人中心页

**Files:**
- Modify: `miniprogram/pages/profile/profile.wxml`
- Modify: `miniprogram/pages/profile/profile.wxss`
- Modify: `miniprogram/pages/profile/profile.js`

**UI 参考：** `docs/ui/user_profile_and_settings_screen/screen.png`

**Step 1: 实现 profile.js**

```javascript
const app = getApp()

Page({
  data: {
    userInfo: null,
    isAdmin: false,
  },

  onShow() {
    this.setData({
      userInfo: app.globalData.userInfo,
      isAdmin: app.globalData.isAdmin,
    })
  },

  goToOrders() {
    wx.switchTab({ url: '/pages/orders/orders' })
  },

  goToAdmin() {
    wx.navigateTo({ url: '/pages/admin/orders/orders' })
  },
})
```

**Step 2: 实现 wxml 和 wxss**

按 UI 稿：
- 头像 + 昵称 + 会员等级
- 我的服务列表（我的订单、联系客服）
- 管理端入口（仅 isAdmin=true 时显示，橙色渐变底色，"管理端入口 - 仅系统管理员可见" + "立即切换"按钮）

**Step 3: Commit**

```bash
git add miniprogram/pages/profile/
git commit -m "feat: 实现个人中心页，含管理员入口条件显示"
```

---

## Task 12: 管理端 - 订单管理页

**Files:**
- Modify: `miniprogram/pages/admin/orders/orders.wxml`
- Modify: `miniprogram/pages/admin/orders/orders.wxss`
- Modify: `miniprogram/pages/admin/orders/orders.js`
- Modify: `miniprogram/pages/admin/orders/orders.json`

**UI 参考：** `docs/ui/2026_03_06_order_miniapp_design.md_4/screen.png`

**Step 1: 实现 admin/orders.js（含 watch 实时监听）**

关键功能：
- Tab 切换：待确认 / 制作中 / 待取餐（显示各自数量）
- watch 监听 orders 集合，新订单到达时振动提醒 + 声音
- 待确认订单：显示商品列表 + 规格 + 备注 + 总价 → "确认接单" / "拒绝" 按钮
- 制作中订单：显示商品制作进度条（步骤 N/M）→ "下一步 (步骤名)" 按钮
- 确认接单时弹出输入预估取餐时间
- 搜索功能：按订单号或手机号搜索

**Step 2: 实现 wxml 和 wxss**

按 UI 稿样式：
- 订单卡片白底圆角，订单号加粗 + 橙色状态标签 + 时间
- 确认接单按钮：橙色实心
- 拒绝按钮：白底边框
- 制作中进度条：蓝色
- "下一步" 按钮：橙色实心，显示下一步骤名称

**Step 3: Commit**

```bash
git add miniprogram/pages/admin/orders/
git commit -m "feat: 实现管理端订单管理页，含实时监听、接单、制作步骤推进"
```

---

## Task 13: 管理端 - 商品管理页

**Files:**
- Modify: `miniprogram/pages/admin/products/products.wxml`
- Modify: `miniprogram/pages/admin/products/products.wxss`
- Modify: `miniprogram/pages/admin/products/products.js`

**UI 参考：**
- 列表：`docs/ui/admin_product_management_screen/screen.png`
- 编辑弹窗：`docs/ui/admin_edit_product_popup/screen.png`

**Step 1: 实现 admin/products.js**

关键功能：
- Tab：全部 / 热销 / 已下架
- 搜索商品名称
- 商品列表：图片 + 名称 + 库存 + 价格 + 编辑按钮 + 上下架 toggle
- 底部"+ 添加新商品"按钮
- 编辑/新增弹窗（半屏）：商品图片上传 + 名称 + 价格 + 分类选择 + 规格设置（关联模板 + 覆盖选项）+ 制作流程关联 + 取消/保存发布

**Step 2: 实现 wxml 和 wxss**

按 UI 稿：
- 商品卡片：左侧图片 + 中间信息 + 右侧编辑按钮和 toggle
- 编辑弹窗：图片上传区（虚线边框 + 相机图标），输入框白底圆角，规格 tag 可删除可添加
- 保存按钮橙色，取消按钮白底

**Step 3: Commit**

```bash
git add miniprogram/pages/admin/products/
git commit -m "feat: 实现管理端商品管理页，含列表、搜索、上下架、新增编辑弹窗"
```

---

## Task 14: 管理端 - 属性模板管理页

**Files:**
- Modify: `miniprogram/pages/admin/specs/specs.wxml`
- Modify: `miniprogram/pages/admin/specs/specs.wxss`
- Modify: `miniprogram/pages/admin/specs/specs.js`

**Step 1: 实现属性模板管理**

关键功能：
- 模板列表：名称 + 类型（单选/多选）+ 选项数量 + 编辑/删除
- 新增/编辑弹窗：模板名称 + 类型切换 + 选项列表（选项名 + 加价金额）+ 添加选项按钮
- 删除前确认

**Step 2: Commit**

```bash
git add miniprogram/pages/admin/specs/
git commit -m "feat: 实现管理端属性模板管理页"
```

---

## Task 15: 管理端 - 制作流程管理页

**Files:**
- Modify: `miniprogram/pages/admin/process/process.wxml`
- Modify: `miniprogram/pages/admin/process/process.wxss`
- Modify: `miniprogram/pages/admin/process/process.js`

**Step 1: 实现制作流程模板管理**

关键功能：
- 流程模板列表：名称 + 步骤数量 + 编辑/删除
- 新增/编辑弹窗：模板名称 + 步骤列表（可拖拽排序/添加/删除步骤）
- 步骤支持自定义名称

**Step 2: Commit**

```bash
git add miniprogram/pages/admin/process/
git commit -m "feat: 实现管理端制作流程模板管理页"
```

---

## Task 16: 管理端 - 分类管理页

**Files:**
- Modify: `miniprogram/pages/admin/categories/categories.wxml`
- Modify: `miniprogram/pages/admin/categories/categories.wxss`
- Modify: `miniprogram/pages/admin/categories/categories.js`

**Step 1: 实现分类管理**

关键功能：
- 分类列表：名称 + 排序 + 启用/禁用 toggle + 关联制作流程 + 编辑/删除
- 新增/编辑弹窗：名称 + 排序 + 关联制作流程选择
- 支持拖拽排序

**Step 2: Commit**

```bash
git add miniprogram/pages/admin/categories/
git commit -m "feat: 实现管理端分类管理页"
```

---

## Task 17: 管理端导航与权限守卫

**Files:**
- Create: `miniprogram/utils/auth.js`
- Modify: 所有管理端页面 js 文件

**Step 1: 创建权限工具**

`miniprogram/utils/auth.js`:
```javascript
const app = getApp()

function checkAdminAccess() {
  if (!app.globalData.isAdmin) {
    wx.showToast({ title: '无管理员权限', icon: 'none' })
    setTimeout(() => {
      wx.navigateBack()
    }, 1500)
    return false
  }
  return true
}

module.exports = { checkAdminAccess }
```

**Step 2: 在每个管理端页面 onLoad 中加入权限检查**

```javascript
const { checkAdminAccess } = require('../../../utils/auth')

Page({
  onLoad() {
    if (!checkAdminAccess()) return
    // ... 正常逻辑
  }
})
```

**Step 3: 管理端页面添加自定义 tabBar 导航**（订单管理/商品管理/系统配置）

按 UI 稿 `docs/ui/2026_03_06_order_miniapp_design.md_4/screen.png` 底部的管理端导航。因为管理端页面不在小程序 tabBar 中，使用自定义组件实现底部导航。

创建 `miniprogram/components/admin-tabbar/admin-tabbar.wxml`:
```xml
<view class="admin-tabbar">
  <view class="tab-item {{active === 'orders' ? 'active' : ''}}" bindtap="goOrders">
    <text class="tab-icon">📋</text>
    <text class="tab-label">订单管理</text>
  </view>
  <view class="tab-item {{active === 'products' ? 'active' : ''}}" bindtap="goProducts">
    <text class="tab-icon">📦</text>
    <text class="tab-label">商品管理</text>
  </view>
  <view class="tab-item {{active === 'settings' ? 'active' : ''}}" bindtap="goSettings">
    <text class="tab-icon">⚙️</text>
    <text class="tab-label">系统配置</text>
  </view>
</view>
```

系统配置页面中入口进入：属性模板管理、制作流程管理、分类管理、管理员管理。

**Step 4: Commit**

```bash
git add miniprogram/utils/ miniprogram/components/admin-tabbar/
git commit -m "feat: 添加管理端权限守卫和自定义底部导航组件"
```

---

## Task 18: 数据库初始化脚本与种子数据

**Files:**
- Create: `scripts/init-db.js`

**Step 1: 创建初始化脚本**

用于本地开发时向云数据库插入初始管理员和示例数据：

```javascript
// 在微信开发者工具的云开发控制台手动执行
// 或通过云函数 initDb 执行

// 1. 创建 admins 集合，插入初始管理员
// 2. 创建 categories 示例数据
// 3. 创建 specTemplates 示例数据
// 4. 创建 processTemplates 示例数据
// 5. 创建 products 示例数据
```

提供完整的示例 JSON 数据，包含：
- 3 个分类：咖啡系列、现烤烘焙、精致甜点
- 4 个属性模板：杯型、糖度、冰量、加料
- 2 个制作流程：饮品制作（调配→封口）、烘焙制作（备料→烘烤→装盘）
- 6 个示例商品（含 specs 覆盖配置）
- 1 个管理员

**Step 2: Commit**

```bash
git add scripts/
git commit -m "feat: 添加数据库初始化脚本和种子数据"
```

---

## Task 19: 联调与收尾

**Step 1:** 在微信开发者工具中部署所有云函数

**Step 2:** 运行初始化脚本创建集合和种子数据

**Step 3:** 逐页面联调验证：
- [ ] 点单页加载菜单正常
- [ ] 商品详情弹窗规格选择正确
- [ ] 购物车加减和总价计算正确
- [ ] 提交订单成功，跳转到订单详情
- [ ] 订单详情 watch 实时更新
- [ ] 我的订单列表分页加载
- [ ] 管理端接单 + 推进制作步骤
- [ ] 全部步骤完成自动变为"可取餐"
- [ ] 管理端商品 CRUD + 上下架
- [ ] 属性模板/流程模板/分类 CRUD
- [ ] 权限守卫：非管理员无法访问管理页面

**Step 4:** 修复联调中发现的问题

**Step 5: Final Commit**

```bash
git add -A
git commit -m "fix: 联调修复与收尾"
```
