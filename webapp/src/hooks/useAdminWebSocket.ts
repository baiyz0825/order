'use client'

import { useEffect, useRef, useCallback } from 'react'
import { getWsUrl } from '@/lib/ws'

export function useAdminWebSocket(
  onNewOrder: (order: any) => void,
  onOrderUpdate: (data: any) => void
) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onNewOrderRef = useRef(onNewOrder)
  const onOrderUpdateRef = useRef(onOrderUpdate)

  // 始终保持最新的回调引用，避免重连时使用过期闭包
  useEffect(() => {
    onNewOrderRef.current = onNewOrder
  }, [onNewOrder])

  useEffect(() => {
    onOrderUpdateRef.current = onOrderUpdate
  }, [onOrderUpdate])

  const connect = useCallback(() => {
    const url = getWsUrl()
    if (!url) return

    // 清理旧连接
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      // 订阅管理端消息
      ws.send(JSON.stringify({ type: 'subscribe_admin' }))
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'new_order') {
          // 新订单：尝试震动提醒
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([200, 100, 200])
          }
          onNewOrderRef.current(data.order)
        }

        if (data.type === 'order_updated') {
          onOrderUpdateRef.current(data)
        }
      } catch {
        // 忽略非法消息
      }
    }

    ws.onclose = () => {
      // 自动重连（3秒间隔）
      reconnectTimerRef.current = setTimeout(() => {
        connect()
      }, 3000)
    }

    ws.onerror = () => {
      // 出错时关闭，触发 onclose 进行重连
      ws.close()
    }
  }, [])

  useEffect(() => {
    connect()

    return () => {
      // cleanup：清理重连定时器并关闭连接
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.onclose = null // 防止 cleanup 时触发重连
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])
}
