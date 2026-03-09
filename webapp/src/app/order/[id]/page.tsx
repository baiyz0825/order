'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useOrderWebSocket } from '@/hooks/useWebSocket'

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
  imageUrl?: string
}

interface Order {
  id: number
  orderNo: string
  sessionId: string
  items: OrderItem[]
  totalPrice: number
  status: 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled'
  estimatedTime: number | null
  remark: string
  createdAt: string
  confirmedAt: string | null
  readyAt: string | null
  completedAt: string | null
}

/* ---------- 常量映射 ---------- */

const STATUS_CONFIG: Record<
  Order['status'],
  { label: string; icon: React.ReactNode }
> = {
  pending: {
    label: '等待接单',
    icon: <ClockIcon />,
  },
  confirmed: {
    label: '正在为您制作中',
    icon: <CoffeeIcon />,
  },
  ready: {
    label: '可以取餐啦',
    icon: <ReadyIcon />,
  },
  completed: {
    label: '订单已完成',
    icon: <CheckIcon />,
  },
  cancelled: {
    label: '订单已取消',
    icon: <CancelIcon />,
  },
}

const PROGRESS_STEPS = ['已下单', '已接单', '待取餐', '已完成']

function getProgressIndex(status: Order['status']): number {
  switch (status) {
    case 'pending':
      return 0
    case 'confirmed':
      return 1
    case 'ready':
      return 2
    case 'completed':
      return 3
    case 'cancelled':
      return -1
    default:
      return 0
  }
}

/* ---------- 工具函数 ---------- */

function formatPrice(priceFen: number): string {
  return (priceFen / 100).toFixed(2)
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function formatSpecsText(specs: OrderItem['selectedSpecs']): string {
  if (!specs || specs.length === 0) return ''
  const parts = specs.flatMap((s) => s.selected || [])
  return parts.join(' / ')
}

/* ---------- 图标组件 ---------- */

function ClockIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="22" stroke="#FF8D4D" strokeWidth="3" fill="#FFF3EC" />
      <path d="M24 14v11l7 4" stroke="#FF8D4D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CoffeeIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="22" stroke="#007AFF" strokeWidth="3" fill="#EBF5FF" />
      <path d="M16 20h12v12a4 4 0 01-4 4h-4a4 4 0 01-4-4V20z" stroke="#007AFF" strokeWidth="2.5" fill="none" />
      <path d="M28 22h2a3 3 0 010 6h-2" stroke="#007AFF" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M18 16c1-2 2-2 3 0s2 2 3 0 2-2 3 0" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  )
}

function ReadyIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="22" stroke="#34C759" strokeWidth="3" fill="#EDFFF3" />
      <path d="M17 30h14M20 24v6M28 24v6" stroke="#34C759" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 16v2" stroke="#34C759" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="24" cy="21" r="3" stroke="#34C759" strokeWidth="2" fill="none" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="22" stroke="#34C759" strokeWidth="3" fill="#EDFFF3" />
      <path d="M16 24l6 6 10-12" stroke="#34C759" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CancelIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="22" stroke="#FF3B30" strokeWidth="3" fill="#FFF0EF" />
      <path d="M18 18l12 12M30 18L18 30" stroke="#FF3B30" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function BackArrowIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ---------- 订单进度条组件 ---------- */

function OrderProgressBar({ status }: { status: Order['status'] }) {
  const activeIndex = getProgressIndex(status)

  return (
    <div className="flex items-center justify-between px-4 py-5">
      {PROGRESS_STEPS.map((step, i) => {
        const isCompleted = activeIndex > i
        const isCurrent = activeIndex === i
        const isActive = isCompleted || isCurrent

        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            {/* 圆点 + 文字 */}
            <div className="flex flex-col items-center">
              <div
                className={`w-3 h-3 rounded-full border-2 transition-colors ${
                  isActive
                    ? 'bg-progress-blue border-progress-blue'
                    : 'bg-white border-text-light'
                }`}
              />
              <span
                className={`mt-1.5 text-xs whitespace-nowrap ${
                  isActive ? 'text-progress-blue font-medium' : 'text-text-light'
                }`}
              >
                {step}
              </span>
            </div>
            {/* 连线（最后一个步骤无连线） */}
            {i < PROGRESS_STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 mt-[-14px] ${
                  activeIndex > i ? 'bg-progress-blue' : 'bg-border-color'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ---------- 商品制作进度时间轴 ---------- */

function ItemProcessTimeline({ steps }: { steps: ProcessStep[] }) {
  if (!steps || steps.length === 0) return null

  // 找到当前步骤：第一个 done=false 的
  const currentIndex = steps.findIndex((s) => !s.done)

  return (
    <div className="mt-3 ml-1">
      {steps.map((step, i) => {
        const isDone = step.done
        const isCurrent = i === currentIndex
        const isLast = i === steps.length - 1

        return (
          <div key={i} className="flex items-stretch">
            {/* 左侧：圆圈 + 竖线 */}
            <div className="flex flex-col items-center mr-3">
              {isDone ? (
                /* 已完成：绿色勾圆 */
                <div className="w-5 h-5 rounded-full bg-success-green flex items-center justify-center shrink-0">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M3 6l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              ) : isCurrent ? (
                /* 当前步骤：蓝色脉冲圆 */
                <div className="relative w-5 h-5 flex items-center justify-center shrink-0">
                  <div className="absolute w-5 h-5 rounded-full bg-progress-blue/20 animate-ping" />
                  <div className="w-3 h-3 rounded-full bg-progress-blue" />
                </div>
              ) : (
                /* 等待步骤：灰色空心圆 */
                <div className="w-5 h-5 rounded-full border-2 border-text-light shrink-0" />
              )}
              {/* 竖线 */}
              {!isLast && (
                <div
                  className={`w-0.5 flex-1 min-h-[20px] ${
                    isDone ? 'bg-success-green' : 'bg-border-color'
                  }`}
                />
              )}
            </div>
            {/* 右侧：步骤信息 */}
            <div className="pb-3 pt-0.5">
              <span
                className={`text-sm ${
                  isDone
                    ? 'text-text-main'
                    : isCurrent
                      ? 'text-progress-blue font-medium'
                      : 'text-text-light'
                }`}
              >
                {step.name}
              </span>
              <span
                className={`ml-2 text-xs ${
                  isDone
                    ? 'text-success-green'
                    : isCurrent
                      ? 'text-progress-blue'
                      : 'text-text-light'
                }`}
              >
                {isDone ? '已完成' : isCurrent ? '进行中' : '等待中'}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ---------- 主页面 ---------- */

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = Number(params.id)

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 获取订单数据
  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`)
      if (!res.ok) {
        setError('订单不存在')
        return
      }
      const data = await res.json()
      setOrder(data)
    } catch {
      setError('加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    if (orderId) fetchOrder()
  }, [orderId, fetchOrder])

  // WebSocket 实时更新
  useOrderWebSocket(orderId, (data) => {
    // 收到 order_updated 事件时刷新数据
    fetchOrder()
  })

  /* ---------- 加载 / 错误状态 ---------- */

  if (loading) {
    return (
      <div className="min-h-screen bg-ios-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-progress-blue border-t-transparent rounded-full animate-spin" />
          <span className="text-text-secondary text-sm">加载中...</span>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-ios-bg flex flex-col items-center justify-center gap-4">
        <p className="text-text-secondary">{error || '订单不存在'}</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-2 bg-progress-blue text-white rounded-full text-sm"
        >
          返回
        </button>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[order.status]
  const progressIndex = getProgressIndex(order.status)

  // 计算 confirmed 状态时，前面还有多少单（用 estimatedTime 近似：每单约5分钟）
  const pendingCount = order.estimatedTime
    ? Math.max(0, Math.ceil(order.estimatedTime / 5) - 1)
    : 0

  return (
    <div className="min-h-screen bg-ios-bg pb-8">
      {/* ===== 顶部导航栏 ===== */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-border-color">
        <div className="flex items-center h-11 px-4">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-8 h-8 -ml-2 text-text-main"
          >
            <BackArrowIcon />
          </button>
          <h1 className="flex-1 text-center text-base font-semibold text-text-main mr-6">
            订单详情
          </h1>
        </div>
      </div>

      {/* ===== 状态区域 ===== */}
      <div className="bg-white px-6 pt-8 pb-6 flex flex-col items-center">
        <div className="mb-3">{statusConfig.icon}</div>
        <h2 className="text-xl font-semibold text-text-main mb-1">
          {statusConfig.label}
        </h2>
        <p className="text-sm text-text-secondary">
          订单号：{order.orderNo}
        </p>
      </div>

      {/* ===== 预计取餐时间卡片（仅 confirmed 状态） ===== */}
      {order.status === 'confirmed' && order.estimatedTime && (
        <div className="mx-4 mt-3 bg-white rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-text-secondary mb-1">预计取餐时间</p>
            <p className="text-2xl font-bold text-progress-blue">
              {order.estimatedTime}
              <span className="text-sm font-normal text-text-secondary ml-1">分钟</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-secondary mb-1">前面还有</p>
            <p className="text-2xl font-bold text-primary">
              {pendingCount}
              <span className="text-sm font-normal text-text-secondary ml-1">单</span>
            </p>
          </div>
        </div>
      )}

      {/* ===== 订单整体进度条 ===== */}
      {order.status !== 'cancelled' && (
        <div className="mx-4 mt-3 bg-white rounded-xl">
          <OrderProgressBar status={order.status} />
        </div>
      )}

      {/* ===== 商品制作进度 ===== */}
      <div className="mx-4 mt-3">
        <h3 className="text-sm font-semibold text-text-main mb-2 px-1">
          商品制作进度
        </h3>

        {order.items.map((item, idx) => {
          const specsText = formatSpecsText(item.selectedSpecs)

          return (
            <div key={idx} className="bg-white rounded-xl p-4 mb-3">
              {/* 商品信息行 */}
              <div className="flex items-start gap-3">
                {/* 商品图片 */}
                <div className="w-[60px] h-[60px] rounded-lg bg-ios-bg overflow-hidden shrink-0 flex items-center justify-center">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                      <path
                        d="M7 21h14M10 17v4M18 17v4M8 12h12l-1 5H9l-1-5zM12 8c0-1.5 1-3 2-3s2 1.5 2 3"
                        stroke="#C7C7CC"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                {/* 商品名称 + 规格 + 数量 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-main truncate">
                    {item.productName}
                  </p>
                  {specsText && (
                    <p className="text-xs text-text-secondary mt-0.5 truncate">
                      {specsText}
                    </p>
                  )}
                  <p className="text-xs text-text-secondary mt-0.5">
                    x{item.quantity}
                  </p>
                </div>
                {/* 单价 */}
                <p className="text-sm font-medium text-text-main shrink-0">
                  &yen;{formatPrice(item.price * item.quantity)}
                </p>
              </div>

              {/* 制作进度时间轴 */}
              {item.process && item.process.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border-color">
                  <ItemProcessTimeline steps={item.process} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ===== 底部订单信息 ===== */}
      <div className="mx-4 mt-3 bg-white rounded-xl p-4">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">下单时间</span>
            <span className="text-text-main">{formatTime(order.createdAt)}</span>
          </div>
          {order.remark && (
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary shrink-0 mr-4">备注信息</span>
              <span className="text-text-main text-right">{order.remark}</span>
            </div>
          )}
          <div className="pt-3 border-t border-border-color flex justify-between items-center">
            <span className="text-sm font-medium text-text-main">实付金额</span>
            <span className="text-lg font-bold text-primary">
              &yen;{formatPrice(order.totalPrice)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
