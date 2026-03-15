import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import bcrypt from 'bcryptjs'

/**
 * POST /api/admin/setup
 * 执行系统初始化
 */
export async function POST(request: Request) {
  try {
    // 1. 检查是否已初始化
    const adminCount = await prisma.user.count({
      where: { role: 'admin' }
    })

    if (adminCount > 0) {
      return NextResponse.json(
        { error: '系统已经初始化，无需重复初始化' },
        { status: 400 }
      )
    }

    // 2. 解析请求数据
    const body = await request.json()
    const { admin, shopInfo, homeContent, seedTestData } = body

    // 3. 验证必填字段
    if (!admin?.email || !admin?.password || !admin?.name) {
      return NextResponse.json(
        { error: '管理员信息不完整' },
        { status: 400 }
      )
    }

    if (!shopInfo?.shopName) {
      return NextResponse.json(
        { error: '店铺名称不能为空' },
        { status: 400 }
      )
    }

    // 4. 验证密码强度
    if (admin.password.length < 8) {
      return NextResponse.json(
        { error: '密码长度至少为8个字符' },
        { status: 400 }
      )
    }

    // 5. 创建管理员账户
    const hashedPassword = await hashPassword(admin.password)
    const newAdmin = await prisma.user.create({
      data: {
        email: admin.email,
        password: hashedPassword,
        name: admin.name,
        role: 'admin',
      },
    })

    // 6. 创建店铺设置
    const settings = [
      {
        key: 'shopName',
        value: shopInfo.shopName,
      },
      {
        key: 'shopSubtitle',
        value: shopInfo.shopSubtitle || '',
      },
      {
        key: 'businessHours',
        value: shopInfo.businessHours || '每日 08:00 - 22:00',
      },
      {
        key: 'address',
        value: shopInfo.address || '',
      },
      {
        key: 'contactInfo',
        value: shopInfo.contactInfo || '',
      },
      {
        key: 'homeWelcomeText',
        value: homeContent?.homeWelcomeText || '欢迎光临！',
      },
      {
        key: 'homeAnnouncementText',
        value: homeContent?.homeAnnouncementText || '',
      },
      // 标记系统已初始化
      {
        key: 'systemInitialized',
        value: 'true',
      },
      // 记录初始化信息
      {
        key: 'initInfo',
        value: JSON.stringify({
          initializedAt: new Date().toISOString(),
          initBy: newAdmin.id,
          version: '1.0.0',
        }),
      },
    ]

    await prisma.shopSetting.createMany({
      data: settings,
      skipDuplicates: true,
    })

    // 7. 如果选择填充测试数据
    if (seedTestData) {
      await seedTestDataForShop()
    }

    return NextResponse.json({
      success: true,
      message: '系统初始化成功',
    })
  } catch (error) {
    console.error('初始化失败:', error)
    return NextResponse.json(
      { error: '初始化失败：' + (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * 填充测试数据
 */
async function seedTestDataForShop() {
  try {
    // 创建分类
    const categories = await Promise.all([
      prisma.category.create({
        data: { name: '咖啡饮品', sort: 1, isActive: true },
      }),
      prisma.category.create({
        data: { name: '手工烘焙', sort: 2, isActive: true },
      }),
      prisma.category.create({
        data: { name: '轻食简餐', sort: 3, isActive: true },
      }),
    ])

    // 创建属性模板（尺寸）
    const sizeTemplate = await prisma.propertyTemplate.create({
      data: {
        name: '尺寸',
        type: 'select',
        options: ['小杯', '中杯', '大杯'],
        isRequired: true,
      },
    })

    // 创建属性模板（温度）
    const tempTemplate = await prisma.propertyTemplate.create({
      data: {
        name: '温度',
        type: 'select',
        options: ['热饮', '冰饮'],
        isRequired: true,
      },
    })

    // 创建示例商品
    await prisma.product.create({
      data: {
        name: '美式咖啡',
        description: '经典美式咖啡，浓郁香醇',
        price: 18,
        categoryId: categories[0].id,
        imageUrl: '/api/placeholder/400?text=Americano',
        isActive: true,
        specs: {
          create: [
            {
              name: '小杯热饮',
              price: 18,
            },
            {
              name: '中杯热饮',
              price: 22,
            },
            {
              name: '大杯热饮',
              price: 25,
            },
            {
              name: '小杯冰饮',
              price: 18,
            },
            {
              name: '中杯冰饮',
              price: 22,
            },
            {
              name: '大杯冰饮',
              price: 25,
            },
          ],
        },
      },
    })

    await prisma.product.create({
      data: {
        name: '拿铁咖啡',
        description: '香浓拿铁，奶泡绵密',
        price: 22,
        categoryId: categories[0].id,
        imageUrl: '/api/placeholder/400?text=Latte',
        isActive: true,
        specs: {
          create: [
            {
              name: '中杯热饮',
              price: 22,
            },
            {
              name: '大杯热饮',
              price: 26,
            },
          ],
        },
      },
    })

    await prisma.product.create({
      data: {
        name: '提拉米苏',
        description: '经典意式甜点，入口即化',
        price: 28,
        categoryId: categories[1].id,
        imageUrl: '/api/placeholder/400?text=Tiramisu',
        isActive: true,
      },
    })

    console.log('测试数据填充成功')
  } catch (error) {
    console.error('填充测试数据失败:', error)
    // 不影响初始化流程，继续执行
  }
}
