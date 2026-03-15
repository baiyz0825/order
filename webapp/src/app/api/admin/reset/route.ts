import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminUser, verifyPassword } from '@/lib/auth'

/**
 * POST /api/admin/reset
 * 重置系统（清空所有数据）
 */
export async function POST(request: Request) {
  try {
    // 1. 验证管理员权限
    const admin = await getAdminUser()
    if (!admin) {
      return NextResponse.json(
        { error: '需要管理员权限' },
        { status: 401 }
      )
    }

    // 2. 解析请求数据
    const body = await request.json()
    const { confirmPassword } = body

    // 3. 验证密码
    if (!confirmPassword) {
      return NextResponse.json(
        { error: '请输入密码确认重置' },
        { status: 400 }
      )
    }

    const isValidPassword = await verifyPassword(confirmPassword, admin.password)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: '密码错误，无法重置系统' },
        { status: 401 }
      )
    }

    // 4. 执行重置操作
    // 删除所有订单规格
    await prisma.productSpec.deleteMany({})

    // 删除所有商品
    await prisma.product.deleteMany({})

    // 删除所有分类
    await prisma.category.deleteMany({})

    // 删除所有属性模板
    await prisma.propertyTemplate.deleteMany({})

    // 删除所有设置
    await prisma.shopSetting.deleteMany({})

    // 删除所有用户（包括当前管理员）
    await prisma.user.deleteMany({})

    // 删除所有订单
    await prisma.order.deleteMany({})

    // 5. 重置完成
    return NextResponse.json({
      success: true,
      message: '系统已重置，请刷新页面进行初始化',
    })
  } catch (error) {
    console.error('重置系统失败:', error)
    return NextResponse.json(
      { error: '重置系统失败：' + (error as Error).message },
      { status: 500 }
    )
  }
}
