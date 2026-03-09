'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

/* ---------- 类型定义 ---------- */

interface OrderItem {
  productId: number
  productName: string
  price: number
  quantity: number
  selectedSpecs: { templateId: number; selected: string[] }[]
}

interface Order {
  id: number
  orderNo: string
  items: OrderItem[] | string
  totalPrice: number
  status: 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled'
  createdAt: string
}

/* ---------- 常量 ---------- */

type TabKey = 'ongoing' | 'completed' | 'cancelled'

interface TabDef {
  key: TabKey
  label: string
  statuses: string
}

const TABS: TabDef[] = [
  { key: 'ongoing', label: '进行中', statuses: 'pending,confirmed,ready' },
  { key: 'completed', label: '已完成', statuses: 'completed' },
  { key: 'cancelled', label: '已取消', statuses: 'cancelled' },
]

const STATUS_LABEL: Record<string, string> = {
  pending: '待确认',
  confirmed: '制作中',
  ready: '待取餐',
  completed: '已完成',
  cancelled: '已取消',
}

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  ready: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-500',
}

/* ---------- 工具函数 ---------- */

function formatPrice(priceFen: number): string {
  return (priceFen / 100).toFixed(2)
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function parseItems(items: OrderItem[] | string): OrderItem[] {
  if (typeof items === 'string') {
    try {
      return JSON.parse(items)
    } catch {
      return []
    }
  }
  return items
}

function getItemsSummary(items: OrderItem[]): string {
  if (items.length === 0) return ''
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const names = items.slice(0, 2).map((item) => item.productName)
  if (items.length > 2) {
    return `${names.join('、')}等${totalCount}件商品`
  }
  if (totalCount > items.length) {
    return `${names.join('、')}等${totalCount}件商品`
  }
  return names.join('、')
}

/* ---------- 图标组件 ---------- */

function BackArrowIcon() {
  return (
    <svg width="10" height="18" viewBox="0 0 10 18" fill="none">
      <path
        d="M9 1L1 9L9 17"
        stroke="#1C1C1E"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function EmptyIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="30" stroke="#E5E5EA" strokeWidth="2" />
      <path
        d="M20 26H44L42 44H22L20 26Z"
        stroke="#C7C7CC"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M26 26V22C26 18.6863 28.6863 16 32 16C35.3137 16 38 18.6863 38 22V26"
        stroke="#C7C7CC"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* ---------- 主页面 ---------- */

export default function OrdersPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>('ongoing')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async (statuses: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/orders?status=${statuses}`)
      if (!res.ok) throw new Error('请求失败')
      const data = await res.json()
      setOrders(data)
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const tab = TABS.find((t) => t.key === activeTab)
    if (tab) {
      fetchOrders(tab.statuses)
    }
  }, [activeTab, fetchOrders])

  const handleTabChange = (key: TabKey) => {
    if (key === activeTab) return
    setActiveTab(key)
  }

  const handleOrderClick = (orderId: number) => {
    router.push(`/order/${orderId}`)
  }

  return (
    <div className="flex min-h-screen flex-col bg-ios-bg">
      {/* ===== 顶部导航栏 ===== */}
      <header className="sticky top-0 z-30 border-b border-border-color bg-white/95 backdrop-blur-sm">
        <div className="flex h-11 items-center px-4">
          <button
            onClick={() => router.back()}
            className="-ml-2 flex h-8 w-8 items-center justify-center text-text-main"
          >
            <BackArrowIcon />
          </button>
          <h1 className="mr-6 flex-1 text-center text-[17px] font-semibold text-text-main">
            我的订单
          </h1>
        </div>
      </header>

      {/* ===== Tab 导航 ===== */}
      <div className="bg-white">
        <div className="flex">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`relative flex-1 py-3 text-center text-sm font-medium transition-colors ${
                  isActive ? 'text-primary' : 'text-text-secondary'
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ===== 订单列表 ===== */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-3">
        {loading ? (
          /* 加载状态 */
          <div className="flex flex-col items-center justify-center pt-24">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
            <span className="mt-3 text-sm text-text-secondary">加载中...</span>
          </div>
        ) : orders.length === 0 ? (
          /* 空状态 */
          <div className="flex flex-col items-center justify-center pt-24">
            <EmptyIcon />
            <p className="mt-4 text-sm text-text-secondary">暂无订单</p>
          </div>
        ) : (
          /* 订单卡片列表 */
          <div className="space-y-3">
            {orders.map((order) => {
              const items = parseItems(order.items)
              const summary = getItemsSummary(items)

              return (
                <div
                  key={order.id}
                  onClick={() => handleOrderClick(order.id)}
                  className="cursor-pointer rounded-xl bg-white p-4 active:bg-gray-50"
                >
                  {/* 顶部行：订单号 + 状态标签 */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-main">
                      {order.orderNo}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_STYLE[order.status] || 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {STATUS_LABEL[order.status] || order.status}
                    </span>
                  </div>

                  {/* 时间行 */}
                  <p className="mt-1.5 text-xs text-text-secondary">
                    {formatTime(order.createdAt)}
                  </p>

                  {/* 商品摘要 */}
                  {summary && (
                    <p className="mt-2 truncate text-sm text-text-main">
                      {summary}
                    </p>
                  )}

                  {/* 底部行：总价 + 查看详情 */}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-base font-semibold text-primary">
                      &yen;{formatPrice(order.totalPrice)}
                    </span>
                    <span className="text-sm text-text-secondary">
                      查看详情 &gt;
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
