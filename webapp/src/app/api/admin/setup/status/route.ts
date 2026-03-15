import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/setup/status
 * 检查系统是否已初始化
 */
export async function GET() {
  try {
    // 检查是否存在管理员用户
    const adminCount = await prisma.user.count({
      where: { role: 'admin' }
    })

    const initialized = adminCount > 0

    // 如果已初始化，获取初始化信息
    let initInfo = null
    if (initialized) {
      const initInfoSetting = await prisma.shopSetting.findUnique({
        where: { key: 'initInfo' }
      })

      if (initInfoSetting?.value) {
        try {
          initInfo = JSON.parse(initInfoSetting.value)
        } catch {
          // 如果解析失败，忽略
        }
      }
    }

    return NextResponse.json({
      initialized,
      initInfo
    })
  } catch (error) {
    console.error('检查初始化状态失败:', error)
    return NextResponse.json(
      { error: '检查初始化状态失败' },
      { status: 500 }
    )
  }
}
