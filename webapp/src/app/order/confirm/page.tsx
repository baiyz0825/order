'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useCart } from '@/lib/cart'

function formatPrice(priceInCents: number): string {
  return (priceInCents / 100).toFixed(2)
}

function formatSpecs(
  selectedSpecs: { templateId: number; templateName: string; type: string; selected: string[] }[]
): string {
  return selectedSpecs
    .map((spec) => spec.selected.join('/'))
    .filter(Boolean)
    .join(' ')
}

export default function OrderConfirmPage() {
  const router = useRouter()
  const { items, clearCart, totalPrice, totalCount } = useCart()
  const [remark, setRemark] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-ios-bg">
        {/* 顶部导航栏 */}
        <header className="sticky top-0 z-10 flex h-11 items-center bg-white/95 px-4 backdrop-blur-sm">
          <button
            onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center"
          >
            <svg
              width="10"
              height="18"
              viewBox="0 0 10 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9 1L1 9L9 17"
                stroke="#1C1C1E"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-[17px] font-semibold text-text-main">
            确认订单
          </h1>
          <div className="w-8" />
        </header>

        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
          <div className="text-[48px]">
            <svg
              width="64"
              height="64"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
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
          </div>
          <p className="text-base text-text-secondary">购物车为空</p>
          <button
            onClick={() => router.push('/')}
            className="mt-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-white"
          >
            去点单
          </button>
        </div>
      </div>
    )
  }

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)

    try {
      const body = {
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          selectedSpecs: item.selectedSpecs.map((spec) => ({
            templateId: spec.templateId,
            selected: spec.selected,
          })),
        })),
        remark,
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '提交订单失败')
      }

      const order = await res.json()
      clearCart()
      router.push(`/order/${order.id}`)
    } catch (error) {
      alert(error instanceof Error ? error.message : '提交订单失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-ios-bg pb-[env(safe-area-inset-bottom)]">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-10 flex h-11 items-center bg-white/95 px-4 backdrop-blur-sm">
        <button
          onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center"
        >
          <svg
            width="10"
            height="18"
            viewBox="0 0 10 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 1L1 9L9 17"
              stroke="#1C1C1E"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="flex-1 text-center text-[17px] font-semibold text-text-main">
          确认订单
        </h1>
        <div className="w-8" />
      </header>

      {/* 可滚动内容区域 */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 pt-3">
        {/* 自取提示卡片 */}
        <div className="mb-3 flex items-center gap-2.5 rounded-xl bg-primary/10 px-4 py-3">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="shrink-0"
          >
            <path
              d="M10 2C5.58 2 2 5.58 2 10C2 14.42 5.58 18 10 18C14.42 18 18 14.42 18 10C18 5.58 14.42 2 10 2ZM10 16C6.69 16 4 13.31 4 10C4 6.69 6.69 4 10 4C13.31 4 16 6.69 16 10C16 13.31 13.31 16 10 16Z"
              fill="#FF8D4D"
            />
            <path
              d="M10.5 6H9V11L13.25 13.5L14 12.26L10.5 10.25V6Z"
              fill="#FF8D4D"
            />
          </svg>
          <span className="text-sm text-primary-dark">
            到店自取，预计 15 分钟后可取
          </span>
        </div>

        {/* 订单明细卡片 */}
        <div className="mb-3 rounded-xl bg-white p-4">
          <h2 className="mb-3 text-base font-semibold text-text-main">订单明细</h2>
          <div className="divide-y divide-border-color">
            {items.map((item) => (
              <div key={item.cartId} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <div className="relative h-[60px] w-[60px] shrink-0 overflow-hidden rounded-lg bg-ios-bg">
                  <Image
                    src={item.imageUrl}
                    alt={item.productName}
                    fill
                    className="object-cover"
                    sizes="60px"
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div>
                    <p className="truncate text-[15px] font-medium text-text-main">
                      {item.productName}
                    </p>
                    {item.selectedSpecs.length > 0 && (
                      <p className="mt-0.5 truncate text-xs text-text-secondary">
                        {formatSpecs(item.selectedSpecs)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-medium text-text-main">
                      ¥{formatPrice(item.price * item.quantity)}
                    </span>
                    <span className="text-sm text-text-secondary">x{item.quantity}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 备注卡片 */}
        <div className="mb-3 rounded-xl bg-white p-4">
          <h2 className="mb-3 text-base font-semibold text-text-main">备注</h2>
          <textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="请输入特殊要求..."
            maxLength={200}
            rows={3}
            className="w-full resize-none rounded-lg bg-ios-bg px-3 py-2.5 text-sm text-text-main placeholder:text-text-light focus:outline-none"
          />
        </div>

        {/* 到店付款提示 */}
        <p className="py-2 text-center text-xs text-text-secondary">
          到店后请向店员付款
        </p>
      </div>

      {/* 底部固定栏 */}
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-border-color bg-white px-4 pb-[env(safe-area-inset-bottom)]">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-sm text-text-main">合计</span>
            <span className="text-xl font-bold text-primary">
              ¥{formatPrice(totalPrice)}
            </span>
            <span className="text-xs text-text-secondary">
              共{totalCount}件
            </span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex h-10 min-w-[120px] items-center justify-center rounded-full bg-primary px-6 text-[15px] font-semibold text-white transition-opacity disabled:opacity-60"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="opacity-25"
                  />
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="opacity-75"
                  />
                </svg>
                提交中...
              </span>
            ) : (
              '提交订单'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
