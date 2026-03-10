'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminWebSocket } from '@/hooks/useAdminWebSocket'

/* ---------- 类型定义 ---------- */

interface ProcessStep {
  name: string
  sort: number
  done: boolean
}

interface OrderItem {
  productId: number
  productName: string
  price: number
  quantity: number
  selectedSpecs: { templateId: number; selected: string[] }[]
  process: ProcessStep[]
}

interface Order {
  id: number
  orderNo: string
  sessionId: string
  items: OrderItem[] | string
  totalPrice: number
  status: 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled'
  estimatedTime: number | null
  remark: string
  createdAt: string
  confirmedAt: string | null
  readyAt: string | null
  completedAt: string | null
}

/* ---------- 常量 ---------- */

type TabKey = 'pending' | 'confirmed' | 'ready'

interface TabDef {
  key: TabKey
  label: string
  status: string
}

const TABS: TabDef[] = [
  { key: 'pending', label: '待确认', status: 'pending' },
  { key: 'confirmed', label: '制作中', status: 'confirmed' },
  { key: 'ready', label: '待取餐', status: 'ready' },
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

function formatSpecsText(specs: OrderItem['selectedSpecs']): string {
  if (!specs || specs.length === 0) return ''
  const parts = specs.flatMap((s) => s.selected || [])
  return parts.join(' / ')
}

/* ---------- 图标组件 ---------- */

function RefreshIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2v6h-6" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M3 22v-6h6" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function EmptyIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="30" stroke="#E5E5EA" strokeWidth="2" />
      <path d="M20 26H44L42 44H22L20 26Z" stroke="#C7C7CC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 26V22C26 18.6863 28.6863 16 32 16C35.3137 16 38 18.6863 38 22V26" stroke="#C7C7CC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ---------- 预计时间弹窗 ---------- */

function EstimatedTimeModal({
  visible,
  onConfirm,
  onCancel,
}: {
  visible: boolean
  onConfirm: (minutes: number) => void
  onCancel: () => void
}) {
  const [minutes, setMinutes] = useState('10')

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-6 w-full max-w-sm rounded-2xl bg-white p-6">
        <h3 className="text-center text-lg font-semibold text-text-main">
          设置预计制作时间
        </h3>
        <p className="mt-2 text-center text-sm text-text-secondary">
          请输入预计完成的分钟数
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <input
            type="number"
            min="1"
            max="120"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="w-24 rounded-xl border border-border-color bg-ios-bg px-4 py-3 text-center text-lg font-semibold text-text-main outline-none focus:border-primary"
          />
          <span className="text-sm text-text-secondary">分钟</span>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border-color py-3 text-sm font-medium text-text-secondary transition-colors active:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={() => {
              const val = parseInt(minutes)
              if (val > 0) onConfirm(val)
            }}
            className="flex-1 rounded-xl bg-primary py-3 text-sm font-medium text-white transition-opacity active:opacity-80"
          >
            确认接单
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------- 制作进度组件（管理端，含按钮） ---------- */

function AdminItemProcess({
  steps,
  orderId,
  itemIndex,
  onAdvanceStep,
  advancing,
}: {
  steps: ProcessStep[]
  orderId: number
  itemIndex: number
  onAdvanceStep: (orderId: number, itemIndex: number, stepIndex: number) => void
  advancing: boolean
}) {
  if (!steps || steps.length === 0) return null

  const allDone = steps.every((s) => s.done)
  // 找到当前步骤：第一个 done === false 的步骤
  const currentStepIndex = steps.findIndex((s) => !s.done)

  return (
    <div className="mt-2">
      {/* 进度点 */}
      <div className="flex items-center gap-1.5 mb-2">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`h-2 w-2 rounded-full ${
              step.done
                ? 'bg-success-green'
                : i === currentStepIndex
                  ? 'bg-progress-blue'
                  : 'bg-border-color'
            }`}
            title={step.name}
          />
        ))}
      </div>

      {allDone ? (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-success-green">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3.5 7l2.5 2.5 4.5-5" stroke="#34C759" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          已完成
        </span>
      ) : (
        <button
          onClick={() => onAdvanceStep(orderId, itemIndex, currentStepIndex)}
          disabled={advancing}
          className="inline-flex items-center gap-1 rounded-lg bg-progress-blue/10 px-3 py-1.5 text-xs font-medium text-progress-blue transition-colors active:bg-progress-blue/20 disabled:opacity-50"
        >
          下一步: {steps[currentStepIndex].name}
        </button>
      )}
    </div>
  )
}

/* ---------- 订单卡片 ---------- */

function OrderCard({
  order,
  activeTab,
  onAccept,
  onReject,
  onAdvanceStep,
  onComplete,
  operating,
  advancing,
}: {
  order: Order
  activeTab: TabKey
  onAccept: (order: Order) => void
  onReject: (orderId: number) => void
  onAdvanceStep: (orderId: number, itemIndex: number, stepIndex: number) => void
  onComplete: (orderId: number) => void
  operating: number | null
  advancing: boolean
}) {
  const items = parseItems(order.items)
  const isOperating = operating === order.id

  return (
    <div className="rounded-xl bg-white p-4">
      {/* 头部行：订单号 + 状态标签 + 下单时间 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-text-main">
            #{order.orderNo}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              STATUS_STYLE[order.status] || 'bg-gray-100 text-gray-500'
            }`}
          >
            {STATUS_LABEL[order.status] || order.status}
          </span>
        </div>
        <span className="text-xs text-text-secondary">
          {formatTime(order.createdAt)}
        </span>
      </div>

      {/* 商品列表 */}
      <div className="mt-3 space-y-2">
        {items.map((item, idx) => {
          const specsText = formatSpecsText(item.selectedSpecs)

          return (
            <div key={idx}>
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-text-main">
                      {item.productName}
                    </span>
                    <span className="shrink-0 text-xs text-text-secondary">
                      x{item.quantity}
                    </span>
                  </div>
                  {specsText && (
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {specsText}
                    </p>
                  )}
                </div>
              </div>

              {/* 制作中 Tab：显示制作进度和步骤按钮 */}
              {activeTab === 'confirmed' && item.process && item.process.length > 0 && (
                <AdminItemProcess
                  steps={item.process}
                  orderId={order.id}
                  itemIndex={idx}
                  onAdvanceStep={onAdvanceStep}
                  advancing={advancing}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* 备注 */}
      {order.remark && (
        <div className="mt-3 rounded-lg bg-yellow-50 px-3 py-2">
          <span className="text-xs text-yellow-700">
            备注：{order.remark}
          </span>
        </div>
      )}

      {/* 底部行：总价 + 操作按钮 */}
      <div className="mt-3 flex items-center justify-between border-t border-border-color pt-3">
        <span className="text-base font-semibold text-primary">
          &yen;{formatPrice(order.totalPrice)}
        </span>

        <div className="flex items-center gap-2">
          {/* 待确认 Tab 操作 */}
          {activeTab === 'pending' && (
            <>
              <button
                onClick={() => onReject(order.id)}
                disabled={isOperating}
                className="rounded-lg border border-danger-red px-4 py-1.5 text-xs font-medium text-danger-red transition-colors active:bg-red-50 disabled:opacity-50"
              >
                拒绝
              </button>
              <button
                onClick={() => onAccept(order)}
                disabled={isOperating}
                className="rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-white transition-opacity active:opacity-80 disabled:opacity-50"
              >
                接单
              </button>
            </>
          )}

          {/* 待取餐 Tab 操作 */}
          {activeTab === 'ready' && (
            <button
              onClick={() => onComplete(order.id)}
              disabled={isOperating}
              className="rounded-lg bg-success-green px-4 py-1.5 text-xs font-medium text-white transition-opacity active:opacity-80 disabled:opacity-50"
            >
              确认取餐
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- 主页面 ---------- */

export default function AdminOrderPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>('pending')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [operating, setOperating] = useState<number | null>(null)
  const [advancing, setAdvancing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  // 预计时间弹窗
  const [showTimeModal, setShowTimeModal] = useState(false)
  const [acceptingOrder, setAcceptingOrder] = useState<Order | null>(null)

  /* ---------- 数据获取 ---------- */

  const fetchOrders = useCallback(
    async (status: string) => {
      try {
        const res = await fetch(`/api/orders?admin=true&status=${status}`)
        if (!res.ok) throw new Error('请求失败')
        const data = await res.json()
        setOrders(data)
      } catch {
        setOrders([])
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    []
  )

  // 获取待确认订单数量（红点用）
  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await fetch('/api/orders?admin=true&status=pending')
      if (!res.ok) return
      const data = await res.json()
      setPendingCount(data.length)
    } catch {
      // 忽略
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    const tab = TABS.find((t) => t.key === activeTab)
    if (tab) {
      fetchOrders(tab.status)
    }
  }, [activeTab, fetchOrders])

  // 初始获取待确认数量
  useEffect(() => {
    fetchPendingCount()
  }, [fetchPendingCount])

  /* ---------- WebSocket ---------- */

  useAdminWebSocket(
    // 新订单回调
    (order) => {
      setPendingCount((prev) => prev + 1)
      // 如果当前在待确认 Tab，直接追加到列表头部
      if (activeTab === 'pending') {
        setOrders((prev) => {
          // 解析 items（可能是字符串）
          const parsedOrder = {
            ...order,
            items: typeof order.items === 'string' ? order.items : JSON.stringify(order.items),
          }
          // 避免重复
          if (prev.some((o) => o.id === parsedOrder.id)) return prev
          return [parsedOrder, ...prev]
        })
      }
    },
    // 订单更新回调
    (data) => {
      // 刷新当前 Tab 列表
      const tab = TABS.find((t) => t.key === activeTab)
      if (tab) {
        fetchOrders(tab.status)
      }
      // 刷新待确认数量
      fetchPendingCount()
    }
  )

  /* ---------- 操作处理 ---------- */

  // 接单
  const handleAccept = (order: Order) => {
    setAcceptingOrder(order)
    setShowTimeModal(true)
  }

  const handleConfirmAccept = async (minutes: number) => {
    if (!acceptingOrder) return
    setShowTimeModal(false)
    setOperating(acceptingOrder.id)

    try {
      const res = await fetch(`/api/orders/${acceptingOrder.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed', estimatedTime: minutes }),
      })

      if (res.ok) {
        // 从当前列表移除
        setOrders((prev) => prev.filter((o) => o.id !== acceptingOrder.id))
        setPendingCount((prev) => Math.max(0, prev - 1))
      }
    } catch {
      // 忽略
    } finally {
      setOperating(null)
      setAcceptingOrder(null)
    }
  }

  // 拒绝
  const handleReject = async (orderId: number) => {
    if (!confirm('确定要拒绝该订单吗？')) return
    setOperating(orderId)

    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      })

      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId))
        setPendingCount((prev) => Math.max(0, prev - 1))
      }
    } catch {
      // 忽略
    } finally {
      setOperating(null)
    }
  }

  // 推进制作步骤
  const handleAdvanceStep = async (
    orderId: number,
    itemIndex: number,
    stepIndex: number
  ) => {
    setAdvancing(true)

    try {
      const res = await fetch(`/api/orders/${orderId}/process`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIndex, stepIndex }),
      })

      if (res.ok) {
        const updatedOrder = await res.json()
        setOrders((prev) =>
          prev
            .map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
            // 如果订单状态变成 ready，从制作中列表移除
            .filter((o) => o.status === 'confirmed')
        )
      }
    } catch {
      // 忽略
    } finally {
      setAdvancing(false)
    }
  }

  // 确认取餐
  const handleComplete = async (orderId: number) => {
    setOperating(orderId)

    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })

      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId))
      }
    } catch {
      // 忽略
    } finally {
      setOperating(null)
    }
  }

  // 刷新
  const handleRefresh = () => {
    setRefreshing(true)
    const tab = TABS.find((t) => t.key === activeTab)
    if (tab) {
      fetchOrders(tab.status)
    }
    fetchPendingCount()
  }

  // 登出
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // 忽略
    }
    router.push('/admin/login')
  }

  /* ---------- Tab 切换 ---------- */

  const handleTabChange = (key: TabKey) => {
    if (key === activeTab) return
    setActiveTab(key)
  }

  /* ---------- 渲染 ---------- */

  return (
    <div className="flex min-h-screen flex-col bg-ios-bg">
      {/* ===== 顶部标题栏 ===== */}
      <header className="sticky top-0 z-30 border-b border-border-color bg-white/95 backdrop-blur-sm">
        <div className="flex h-11 items-center justify-between px-4">
          <h1 className="text-[17px] font-semibold text-text-main">
            订单管理
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={`flex h-8 w-8 items-center justify-center text-text-secondary transition-transform ${
                refreshing ? 'animate-spin' : ''
              }`}
            >
              <RefreshIcon />
            </button>
            <button
              onClick={handleLogout}
              className="flex h-8 w-8 items-center justify-center text-text-secondary"
            >
              <LogoutIcon />
            </button>
          </div>
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
                <span className="relative">
                  {tab.label}
                  {/* 待确认 Tab 红点 */}
                  {tab.key === 'pending' && pendingCount > 0 && (
                    <span className="absolute -right-5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-red px-1 text-[10px] font-medium text-white">
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  )}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ===== 订单列表 ===== */}
      <div className="flex-1 overflow-y-auto px-4 pb-20 pt-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center pt-24">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
            <span className="mt-3 text-sm text-text-secondary">加载中...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-24">
            <EmptyIcon />
            <p className="mt-4 text-sm text-text-secondary">暂无订单</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                activeTab={activeTab}
                onAccept={handleAccept}
                onReject={handleReject}
                onAdvanceStep={handleAdvanceStep}
                onComplete={handleComplete}
                operating={operating}
                advancing={advancing}
              />
            ))}
          </div>
        )}
      </div>

      {/* ===== 预计时间弹窗 ===== */}
      <EstimatedTimeModal
        visible={showTimeModal}
        onConfirm={handleConfirmAccept}
        onCancel={() => {
          setShowTimeModal(false)
          setAcceptingOrder(null)
        }}
      />
    </div>
  )
}
