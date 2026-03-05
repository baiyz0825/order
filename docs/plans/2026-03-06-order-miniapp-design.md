# 点单微信小程序设计文档

## 概述

一款线上下单、到店自取的微信小程序。单店模式，支持混合商品类型（饮品/餐食/烘焙等），到店付款。同一小程序内通过白名单机制区分普通用户和管理员角色。

## 技术选型

- **前端**：微信原生小程序
- **后端**：微信云开发（云函数 + 云数据库 + 云存储）
- **实时通知**：云数据库 watch + 微信订阅消息（方案 C）
- **UI 风格**：扁平化、类 iOS、简洁清晰

## 架构设计

```
┌──────────────────────────────────────┐
│         微信小程序（原生）             │
│  ┌──────────────┐ ┌───────────────┐  │
│  │  用户端页面   │ │  管理端页面    │  │
│  │  (所有用户)   │ │ (白名单用户)   │  │
│  └──────┬───────┘ └──────┬────────┘  │
│         └────────┬───────┘           │
│         ┌────────▼────────┐          │
│         │   公共服务层      │          │
│         │ (权限/请求/缓存)  │          │
│         └────────┬────────┘          │
└──────────────────┼───────────────────┘
                   │
       ┌───────────▼───────────┐
       │     微信云开发         │
       │  ┌──────────────────┐ │
       │  │  云函数（业务/鉴权）│ │
       │  ├──────────────────┤ │
       │  │  云数据库（MongoDB）│ │
       │  ├──────────────────┤ │
       │  │  云存储（商品图片） │ │
       │  └──────────────────┘ │
       └───────────────────────┘
```

### 权限模型

- 云数据库 `admins` 集合记录管理员 openId
- 用户登录时云函数检查 openId 是否在白名单内
- 小程序根据角色信息决定是否显示管理入口
- 管理端所有操作经云函数二次权限校验，防止越权

## 数据模型

### categories（商品分类）

```json
{
  "_id": "string",
  "name": "饮品",
  "sort": 1,
  "isActive": true,
  "processTemplateId": "tpl_xxx"
}
```

### specTemplates（属性模板）

可复用的定制属性池，作为基础选项，商品可在关联时覆盖具体选项。

```json
{
  "_id": "string",
  "name": "杯型",
  "type": "single | multiple",
  "options": [
    { "name": "中杯", "priceDelta": 0 },
    { "name": "大杯", "priceDelta": 300 },
    { "name": "超大杯", "priceDelta": 500 }
  ]
}
```

### processTemplates（制作流程模板）

按商品/分类自定义制作流程，管理后台可自由添加/编辑/删除步骤。

```json
{
  "_id": "string",
  "name": "饮品制作流程",
  "steps": [
    { "name": "调配", "sort": 1 },
    { "name": "封口", "sort": 2 }
  ]
}
```

### products（商品）

```json
{
  "_id": "string",
  "categoryId": "xxx",
  "name": "冰美式",
  "description": "...",
  "price": 1800,
  "imageUrl": "cloud://...",
  "isOnSale": true,
  "sort": 1,
  "specs": [
    {
      "templateId": "tpl_topping",
      "required": false,
      "overrideOptions": [
        { "name": "珍珠", "priceDelta": 200 },
        { "name": "椰果", "priceDelta": 200 }
      ]
    },
    {
      "templateId": "tpl_sugar",
      "required": true,
      "overrideOptions": null
    }
  ],
  "processTemplateId": null,
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

- `specs.overrideOptions`：`null` 表示使用模板原始选项，非 null 则覆盖为指定的子集
- `processTemplateId`：`null` 表示继承分类的制作流程

### orders（订单）

```json
{
  "_id": "string",
  "orderNo": "20260306001",
  "userId": "openId",
  "items": [
    {
      "productId": "xxx",
      "productName": "冰美式",
      "price": 1800,
      "quantity": 1,
      "specs": [
        { "name": "杯型", "value": "大杯", "priceDelta": 300 },
        { "name": "糖度", "value": "三分糖", "priceDelta": 0 }
      ],
      "subtotal": 2100,
      "process": {
        "templateName": "饮品制作流程",
        "steps": [
          { "name": "调配", "status": "completed", "updatedAt": "Date" },
          { "name": "封口", "status": "pending", "updatedAt": null }
        ],
        "currentStep": 1
      }
    }
  ],
  "totalPrice": 2100,
  "status": "pending | confirmed | ready | completed | cancelled",
  "estimatedTime": 15,
  "remark": "少冰",
  "createdAt": "Date",
  "confirmedAt": "Date",
  "readyAt": "Date",
  "completedAt": "Date"
}
```

### 订单状态流转

```
pending（待确认）→ confirmed（已确认/制作中）→ ready（可取餐）→ completed（已完成）
                                                              ↘ cancelled（已取消）
```

当所有商品的所有制作步骤完成时，订单自动变为 `ready`。

### admins（管理员白名单）

```json
{
  "_id": "string",
  "openId": "xxx",
  "name": "店长小王",
  "role": "admin | staff",
  "createdAt": "Date"
}
```

## 页面结构

### 用户端

| 页面 | 路径 | 说明 |
|------|------|------|
| 点单页 | pages/menu/menu | 左侧分类导航 + 右侧商品列表，底部购物车浮层 |
| 商品详情 | 半屏弹窗 | 商品信息 + 规格/加料/口味选择器 + 加入购物车 |
| 购物车 | 底部弹出面板 | 已选商品列表，修改数量/删除，备注输入，提交订单 |
| 订单确认页 | pages/order-confirm/order-confirm | 商品明细 + 总价 + 备注确认 + 确认下单 |
| 订单详情页 | pages/order-detail/order-detail | 订单状态进度条 + 每个商品的制作进度 + 预估取餐时间 |
| 我的订单页 | pages/orders/orders | 按状态分 Tab（进行中/已完成），点击进入详情 |

### 管理端（白名单用户可见）

| 页面 | 路径 | 说明 |
|------|------|------|
| 订单管理 | pages/admin/orders/orders | 实时推送新订单，按状态分 Tab，确认/推进步骤/标记可取餐 |
| 商品管理 | pages/admin/products/products | 商品列表，CRUD，上下架，关联属性模板（支持覆盖选项） |
| 属性模板管理 | pages/admin/specs/specs | 属性模板 CRUD（名称/单选多选/选项及加价） |
| 制作流程管理 | pages/admin/process/process | 制作流程模板 CRUD（步骤名称和顺序） |
| 分类管理 | pages/admin/categories/categories | 分类 CRUD，排序，启用/禁用，关联制作流程 |

### tabBar

```
用户视角:
┌──────────┬──────────┬──────────┐
│   点单    │   订单    │   我的   │
└──────────┴──────────┴──────────┘

管理员通过"我的"页面进入管理后台
```

## 用户流程

```
用户打开小程序 → 点单页浏览菜单 → 点击商品弹出详情
→ 选规格/加料/口味 → 加入购物车 → 查看购物车
→ 确认订单(填备注) → 提交订单 → 查看订单状态
→ 商家确认 → 实时查看制作进度 → 可取餐 → 到店自取付款 → 完成
```

## 云函数清单

| 云函数 | 职责 |
|--------|------|
| `login` | 获取用户 openId，检查是否管理员，返回角色信息 |
| `getMenu` | 获取分类 + 上架商品列表 + 关联的属性模板 |
| `submitOrder` | 校验商品/规格有效性，创建订单，触发订阅消息通知 |
| `updateOrderStatus` | 管理员推进订单状态（鉴权） |
| `updateItemProcess` | 管理员推进单个商品制作步骤（鉴权） |
| `manageProducts` | 商品 CRUD、上下架（鉴权） |
| `manageCategories` | 分类 CRUD（鉴权） |
| `manageSpecs` | 属性模板 CRUD（鉴权） |
| `manageProcess` | 制作流程模板 CRUD（鉴权） |
| `manageAdmins` | 管理员白名单 CRUD（超级管理员鉴权） |
| `getOrders` | 查询订单列表（用户查自己的，管理员查全部） |

## 实时通知方案

### 在线通知（watch）

- 商家端打开订单管理页时，`watch` 监听 orders 集合中 `status = "pending"` 的新增记录
- 新订单到达时自动刷新列表 + 声音/振动提醒
- 用户端打开订单详情时，`watch` 监听该订单的变更，实时更新制作进度

### 离线通知（订阅消息）

- 用户下单时，云函数调用订阅消息接口推送给管理员
- 管理员在管理后台定期续订通知权限

## UI 设计要点

- 扁平化、类 iOS 设计风格
- 主色调：白底 + 一个品牌主色（如暖橙/深蓝）
- 字体：系统默认字体，层级清晰（标题/正文/辅助文字）
- 卡片/列表使用微妙阴影或边线分隔
- 圆角适中（8-12rpx），按钮圆角稍大
