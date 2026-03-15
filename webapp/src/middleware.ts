import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { verifyToken } from './lib/auth'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // 自动设置 session_id cookie
  if (!request.cookies.get('session_id')) {
    response.cookies.set('session_id', uuidv4(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60,
    })
  }

  const { pathname } = request.nextUrl
  const userToken = request.cookies.get('user_token')?.value
  const adminToken = request.cookies.get('admin_token')?.value

  // 已登录顾客访问登录页 → 跳转到首页或 redirect 参数指定的页面
  if (pathname === '/login') {
    if (userToken) {
      const redirectTo = request.nextUrl.searchParams.get('redirect') || '/'
      return NextResponse.redirect(new URL(redirectTo, request.url))
    }
    return response
  }

  // 管理端路由处理
  if (pathname.startsWith('/admin')) {
    // 初始化页面和初始化API不需要检查
    if (pathname === '/admin/setup' || pathname.startsWith('/api/admin/setup')) {
      // 如果已初始化且访问初始化页面，重定向到管理后台
      if (pathname === '/admin/setup' && !pathname.startsWith('/api')) {
        try {
          // 检查初始化状态
          const statusResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/api/admin/setup/status`, {
            headers: {
              cookie: request.headers.get('cookie') || '',
            },
          })
          if (statusResponse.ok) {
            const { initialized } = await statusResponse.json()
            if (initialized) {
              return NextResponse.redirect(new URL('/admin', request.url))
            }
          }
        } catch (error) {
          console.error('检查初始化状态失败:', error)
        }
      }
      return response
    }

    // 检查系统初始化状态（除了初始化相关路由）
    try {
      const statusResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/api/admin/setup/status`, {
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      })
      if (statusResponse.ok) {
        const { initialized } = await statusResponse.json()
        if (!initialized) {
          // 未初始化，重定向到初始化页面
          return NextResponse.redirect(new URL('/admin/setup', request.url))
        }
      }
    } catch (error) {
      console.error('检查初始化状态失败:', error)
      // 出错时假设已初始化，避免死循环
    }

    // 已登录管理员访问管理登录/注册页 → 跳转到管理后台
    if (pathname === '/admin/login' || pathname === '/admin/register') {
      if (adminToken) {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
      return response
    }

    // 管理端页面鉴权（非API路由）
    if (!pathname.startsWith('/api') && !adminToken) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  // C端需要登录的页面
  const customerAuthPaths = ['/orders', '/profile', '/order/confirm', '/order/']
  const needsAuth = customerAuthPaths.some((p) =>
    p.endsWith('/') ? pathname.startsWith(p) : pathname === p || pathname.startsWith(p + '/')
  )

  if (needsAuth) {
    if (!userToken) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icons|uploads|manifest.json|sw.js).*)',
  ],
}
