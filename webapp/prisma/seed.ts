import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('开始填充种子数据...')

  // 1. 创建开发管理员（仅用于开发/测试环境）
  // 生产环境的管理员由用户在初始化向导中创建
  if (process.env.CREATE_DEV_ADMIN === 'true') {
    const hashedPassword = await bcrypt.hash('admin123', 10)
    let admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } })
    if (!admin) {
      admin = await prisma.user.create({
        data: {
          email: 'admin@example.com',
          password: hashedPassword,
          name: '店长',
          role: 'admin',
        },
      })
      console.log(`开发管理员已创建: ${admin.email}`)
    }
  }

  // 1.5 创建 mock 顾客用户
  const customerPassword = await bcrypt.hash('123456', 10)
  const customer1 = await prisma.user.create({
    data: {
      phone: '13800138001',
      password: customerPassword,
      name: '张小明',
      role: 'customer',
    },
  })
  const customer2 = await prisma.user.create({
    data: {
      phone: '13800138002',
      password: customerPassword,
      name: '李咖啡',
      role: 'customer',
    },
  })
  const customer3 = await prisma.user.create({
    data: {
      phone: '13800138003',
      password: customerPassword,
      name: '王烘焙',
      role: 'customer',
    },
  })
  console.log('Mock 顾客用户已创建')

  // 2. 创建属性模板
  const specCup = await prisma.specTemplate.create({
    data: {
      name: '杯型',
      type: 'single',
      options: JSON.stringify([
        { name: '中杯', priceDelta: 0 },
        { name: '大杯', priceDelta: 300 },
        { name: '超大杯', priceDelta: 500 },
      ]),
    },
  })

  const specSugar = await prisma.specTemplate.create({
    data: {
      name: '糖度',
      type: 'single',
      options: JSON.stringify([
        { name: '全糖', priceDelta: 0 },
        { name: '七分糖', priceDelta: 0 },
        { name: '五分糖', priceDelta: 0 },
        { name: '三分糖', priceDelta: 0 },
        { name: '无糖', priceDelta: 0 },
      ]),
    },
  })

  const specIce = await prisma.specTemplate.create({
    data: {
      name: '冰量',
      type: 'single',
      options: JSON.stringify([
        { name: '正常冰', priceDelta: 0 },
        { name: '少冰', priceDelta: 0 },
        { name: '去冰', priceDelta: 0 },
        { name: '热', priceDelta: 0 },
      ]),
    },
  })

  const specTopping = await prisma.specTemplate.create({
    data: {
      name: '加料',
      type: 'multiple',
      options: JSON.stringify([
        { name: '珍珠', priceDelta: 200 },
        { name: '椰果', priceDelta: 200 },
        { name: '红豆', priceDelta: 300 },
        { name: '布丁', priceDelta: 300 },
      ]),
    },
  })
  console.log('属性模板已创建')

  // 3. 创建制作流程模板
  const processDrink = await prisma.processTemplate.create({
    data: {
      name: '饮品制作流程',
      steps: JSON.stringify([
        { name: '调配', sort: 1 },
        { name: '封口', sort: 2 },
      ]),
    },
  })

  const processBake = await prisma.processTemplate.create({
    data: {
      name: '烘焙制作流程',
      steps: JSON.stringify([
        { name: '备料', sort: 1 },
        { name: '烘烤', sort: 2 },
        { name: '装盘', sort: 3 },
      ]),
    },
  })
  console.log('制作流程模板已创建')

  // 4. 创建分类
  const catRecommend = await prisma.category.create({
    data: { name: '人气推荐', sort: 0, isActive: true, processTemplateId: null },
  })
  const catCoffee = await prisma.category.create({
    data: { name: '咖啡系列', sort: 1, isActive: true, processTemplateId: processDrink.id },
  })
  const catSeason = await prisma.category.create({
    data: { name: '季节限定', sort: 2, isActive: true, processTemplateId: processDrink.id },
  })
  const catBake = await prisma.category.create({
    data: { name: '现烤烘焙', sort: 3, isActive: true, processTemplateId: processBake.id },
  })
  const catDessert = await prisma.category.create({
    data: { name: '精致甜点', sort: 4, isActive: true, processTemplateId: processBake.id },
  })
  await prisma.category.create({
    data: { name: '周边商品', sort: 5, isActive: true, processTemplateId: null },
  })
  console.log('分类已创建')

  // 5. 创建示例商品
  const productIceAmericano = await prisma.product.create({
    data: {
      name: '冰美式',
      description: '精选日晒豆，中深烘焙，口感纯净，自带果酸余韵。',
      price: 1800,
      imageUrl: '',
      isOnSale: true,
      sort: 1,
      categoryId: catCoffee.id,
      specs: JSON.stringify([
        { templateId: specCup.id, required: false, overrideOptions: null },
        { templateId: specSugar.id, required: true, overrideOptions: null },
        { templateId: specIce.id, required: true, overrideOptions: null },
      ]),
      processTemplateId: null,
    },
  })

  const productOatLatte = await prisma.product.create({
    data: {
      name: '燕麦拿铁',
      description: '经典燕麦奶配比，麦香浓郁，乳糖不耐受友好。',
      price: 2800,
      imageUrl: '',
      isOnSale: true,
      sort: 2,
      categoryId: catCoffee.id,
      specs: JSON.stringify([
        { templateId: specCup.id, required: false, overrideOptions: null },
        { templateId: specSugar.id, required: true, overrideOptions: null },
        { templateId: specIce.id, required: true, overrideOptions: null },
        { templateId: specTopping.id, required: false, overrideOptions: null },
      ]),
      processTemplateId: null,
    },
  })

  const productGeiSha = await prisma.product.create({
    data: {
      name: '手冲瑰夏',
      description: '巴拿马翡翠庄园，优雅的花香与柑橘调性。',
      price: 5800,
      imageUrl: '',
      isOnSale: true,
      sort: 3,
      categoryId: catCoffee.id,
      specs: JSON.stringify([]),
      processTemplateId: null,
    },
  })

  const productCroissant = await prisma.product.create({
    data: {
      name: '法式原味可颂',
      description: '传统开酥工艺，外皮金黄酥脆，内里蜂窝组织完美。',
      price: 1600,
      imageUrl: '',
      isOnSale: true,
      sort: 1,
      categoryId: catBake.id,
      specs: JSON.stringify([]),
      processTemplateId: null,
    },
  })

  const productMuffin = await prisma.product.create({
    data: {
      name: '蓝莓爆浆马芬',
      description: '每日新鲜制作，选用当季新鲜大粒蓝莓。',
      price: 1500,
      imageUrl: '',
      isOnSale: true,
      sort: 2,
      categoryId: catBake.id,
      specs: JSON.stringify([]),
      processTemplateId: null,
    },
  })

  const productCheesecake = await prisma.product.create({
    data: {
      name: '草莓芝士蛋糕',
      description: '新鲜草莓搭配顺滑芝士，甜而不腻。',
      price: 4200,
      imageUrl: '',
      isOnSale: true,
      sort: 1,
      categoryId: catDessert.id,
      specs: JSON.stringify([]),
      processTemplateId: null,
    },
  })
  console.log('示例商品已创建')

  // 6. 初始化店铺设置
  const defaultSettings = [
    { key: 'shopName', value: '精品咖啡烘焙店' },
    { key: 'shopSubtitle', value: '专注手冲与手工烘焙' },
    { key: 'aboutText', value: '我们是一家专注于精品咖啡的烘焙店，精选来自世界各地的优质咖啡豆，采用专业烘焙工艺，为您带来每一杯都值得细细品味的好咖啡。' },
    { key: 'businessHours', value: '每日 08:00 - 22:00' },
    { key: 'address', value: '请到店咨询' },
    { key: 'contactInfo', value: '' },
    { key: 'homeWelcomeText', value: '欢迎光临，开启美好的一天' },
    { key: 'homeAnnouncementText', value: '新品上市：手冲瑰夏，来自巴拿马翡翠庄园' },
    { key: 'homeBannerUrl', value: '' },
  ]

  for (const setting of defaultSettings) {
    await prisma.shopSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    })
  }
  console.log('店铺设置已初始化')

  // 7. 创建 Mock 订单数据
  const drinkProcess = [
    { name: '调配', sort: 1, done: true },
    { name: '封口', sort: 2, done: true },
  ]
  const drinkProcessPartial = [
    { name: '调配', sort: 1, done: true },
    { name: '封口', sort: 2, done: false },
  ]
  const drinkProcessPending = [
    { name: '调配', sort: 1, done: false },
    { name: '封口', sort: 2, done: false },
  ]
  const bakeProcess = [
    { name: '备料', sort: 1, done: true },
    { name: '烘烤', sort: 2, done: true },
    { name: '装盘', sort: 3, done: true },
  ]
  const bakeProcessPartial = [
    { name: '备料', sort: 1, done: true },
    { name: '烘烤', sort: 2, done: false },
    { name: '装盘', sort: 3, done: false },
  ]

  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

  // 订单 1：已完成 — 张小明 — 冰美式(大杯/五分糖/少冰) + 法式可颂
  await prisma.order.create({
    data: {
      orderNo: '202603100001',
      sessionId: 'mock-session-001',
      userId: customer1.id,
      totalPrice: 1800 + 300 + 1600,
      status: 'completed',
      remark: '少冰，谢谢',
      createdAt: threeHoursAgo,
      confirmedAt: new Date(threeHoursAgo.getTime() + 2 * 60 * 1000),
      readyAt: new Date(threeHoursAgo.getTime() + 15 * 60 * 1000),
      completedAt: new Date(threeHoursAgo.getTime() + 20 * 60 * 1000),
      items: JSON.stringify([
        {
          productId: productIceAmericano.id,
          productName: '冰美式',
          price: 2100,
          quantity: 1,
          selectedSpecs: [
            { templateId: specCup.id, selected: ['大杯'] },
            { templateId: specSugar.id, selected: ['五分糖'] },
            { templateId: specIce.id, selected: ['少冰'] },
          ],
          process: drinkProcess,
        },
        {
          productId: productCroissant.id,
          productName: '法式原味可颂',
          price: 1600,
          quantity: 1,
          selectedSpecs: [],
          process: bakeProcess,
        },
      ]),
    },
  })

  // 订单 2：已完成 — 李咖啡 — 燕麦拿铁 x2 + 草莓芝士蛋糕
  await prisma.order.create({
    data: {
      orderNo: '202603100002',
      sessionId: 'mock-session-002',
      userId: customer2.id,
      totalPrice: 2800 * 2 + 4200,
      status: 'completed',
      remark: '',
      createdAt: twoHoursAgo,
      confirmedAt: new Date(twoHoursAgo.getTime() + 3 * 60 * 1000),
      readyAt: new Date(twoHoursAgo.getTime() + 12 * 60 * 1000),
      completedAt: new Date(twoHoursAgo.getTime() + 18 * 60 * 1000),
      items: JSON.stringify([
        {
          productId: productOatLatte.id,
          productName: '燕麦拿铁',
          price: 2800,
          quantity: 2,
          selectedSpecs: [
            { templateId: specSugar.id, selected: ['七分糖'] },
            { templateId: specIce.id, selected: ['正常冰'] },
          ],
          process: drinkProcess,
        },
        {
          productId: productCheesecake.id,
          productName: '草莓芝士蛋糕',
          price: 4200,
          quantity: 1,
          selectedSpecs: [],
          process: bakeProcess,
        },
      ]),
    },
  })

  // 订单 3：待取餐 — 王烘焙 — 手冲瑰夏
  await prisma.order.create({
    data: {
      orderNo: '202603100003',
      sessionId: 'mock-session-003',
      userId: customer3.id,
      totalPrice: 5800,
      status: 'ready',
      remark: '打包带走',
      createdAt: oneHourAgo,
      confirmedAt: new Date(oneHourAgo.getTime() + 1 * 60 * 1000),
      readyAt: new Date(oneHourAgo.getTime() + 10 * 60 * 1000),
      items: JSON.stringify([
        {
          productId: productGeiSha.id,
          productName: '手冲瑰夏',
          price: 5800,
          quantity: 1,
          selectedSpecs: [],
          process: drinkProcess,
        },
      ]),
    },
  })

  // 订单 4：制作中 — 张小明 — 冰美式 + 蓝莓马芬 x2
  await prisma.order.create({
    data: {
      orderNo: '202603100004',
      sessionId: 'mock-session-001',
      userId: customer1.id,
      totalPrice: 1800 + 1500 * 2,
      status: 'confirmed',
      estimatedTime: 15,
      remark: '',
      createdAt: new Date(now.getTime() - 20 * 60 * 1000),
      confirmedAt: new Date(now.getTime() - 18 * 60 * 1000),
      items: JSON.stringify([
        {
          productId: productIceAmericano.id,
          productName: '冰美式',
          price: 1800,
          quantity: 1,
          selectedSpecs: [
            { templateId: specSugar.id, selected: ['无糖'] },
            { templateId: specIce.id, selected: ['去冰'] },
          ],
          process: drinkProcessPartial,
        },
        {
          productId: productMuffin.id,
          productName: '蓝莓爆浆马芬',
          price: 1500,
          quantity: 2,
          selectedSpecs: [],
          process: bakeProcessPartial,
        },
      ]),
    },
  })

  // 订单 5：待确认 — 李咖啡 — 燕麦拿铁(超大杯/加珍珠) + 法式可颂 x3
  await prisma.order.create({
    data: {
      orderNo: '202603100005',
      sessionId: 'mock-session-004',
      userId: customer2.id,
      totalPrice: 2800 + 500 + 200 + 1600 * 3,
      status: 'pending',
      remark: '珍珠多加一点~',
      createdAt: new Date(now.getTime() - 5 * 60 * 1000),
      items: JSON.stringify([
        {
          productId: productOatLatte.id,
          productName: '燕麦拿铁',
          price: 3500,
          quantity: 1,
          selectedSpecs: [
            { templateId: specCup.id, selected: ['超大杯'] },
            { templateId: specSugar.id, selected: ['三分糖'] },
            { templateId: specIce.id, selected: ['少冰'] },
            { templateId: specTopping.id, selected: ['珍珠'] },
          ],
          process: drinkProcessPending,
        },
        {
          productId: productCroissant.id,
          productName: '法式原味可颂',
          price: 1600,
          quantity: 3,
          selectedSpecs: [],
          process: [
            { name: '备料', sort: 1, done: false },
            { name: '烘烤', sort: 2, done: false },
            { name: '装盘', sort: 3, done: false },
          ],
        },
      ]),
    },
  })

  // 订单 6：已取消 — 李咖啡 — 昨天的订单
  await prisma.order.create({
    data: {
      orderNo: '202603090001',
      sessionId: 'mock-session-002',
      userId: customer2.id,
      totalPrice: 4200,
      status: 'cancelled',
      remark: '',
      createdAt: yesterday,
      confirmedAt: new Date(yesterday.getTime() + 2 * 60 * 1000),
      items: JSON.stringify([
        {
          productId: productCheesecake.id,
          productName: '草莓芝士蛋糕',
          price: 4200,
          quantity: 1,
          selectedSpecs: [],
          process: [],
        },
      ]),
    },
  })

  // 订单 7：已完成 — 王烘焙 — 前天的大单
  await prisma.order.create({
    data: {
      orderNo: '202603080001',
      sessionId: 'mock-session-005',
      userId: customer3.id,
      totalPrice: 1800 + 2800 + 5800 + 1600 + 1500,
      status: 'completed',
      remark: '公司下午茶',
      createdAt: twoDaysAgo,
      confirmedAt: new Date(twoDaysAgo.getTime() + 1 * 60 * 1000),
      readyAt: new Date(twoDaysAgo.getTime() + 20 * 60 * 1000),
      completedAt: new Date(twoDaysAgo.getTime() + 25 * 60 * 1000),
      items: JSON.stringify([
        {
          productId: productIceAmericano.id,
          productName: '冰美式',
          price: 1800,
          quantity: 1,
          selectedSpecs: [
            { templateId: specSugar.id, selected: ['全糖'] },
            { templateId: specIce.id, selected: ['正常冰'] },
          ],
          process: drinkProcess,
        },
        {
          productId: productOatLatte.id,
          productName: '燕麦拿铁',
          price: 2800,
          quantity: 1,
          selectedSpecs: [
            { templateId: specSugar.id, selected: ['七分糖'] },
            { templateId: specIce.id, selected: ['热'] },
          ],
          process: drinkProcess,
        },
        {
          productId: productGeiSha.id,
          productName: '手冲瑰夏',
          price: 5800,
          quantity: 1,
          selectedSpecs: [],
          process: drinkProcess,
        },
        {
          productId: productCroissant.id,
          productName: '法式原味可颂',
          price: 1600,
          quantity: 1,
          selectedSpecs: [],
          process: bakeProcess,
        },
        {
          productId: productMuffin.id,
          productName: '蓝莓爆浆马芬',
          price: 1500,
          quantity: 1,
          selectedSpecs: [],
          process: bakeProcess,
        },
      ]),
    },
  })

  // 订单 8：待确认 — 张小明 — 刚下的单
  await prisma.order.create({
    data: {
      orderNo: '202603100006',
      sessionId: 'mock-session-006',
      userId: customer1.id,
      totalPrice: 2800 + 300 + 200 + 4200,
      status: 'pending',
      remark: '',
      createdAt: new Date(now.getTime() - 1 * 60 * 1000),
      items: JSON.stringify([
        {
          productId: productOatLatte.id,
          productName: '燕麦拿铁',
          price: 3300,
          quantity: 1,
          selectedSpecs: [
            { templateId: specCup.id, selected: ['大杯'] },
            { templateId: specSugar.id, selected: ['全糖'] },
            { templateId: specIce.id, selected: ['正常冰'] },
            { templateId: specTopping.id, selected: ['椰果'] },
          ],
          process: drinkProcessPending,
        },
        {
          productId: productCheesecake.id,
          productName: '草莓芝士蛋糕',
          price: 4200,
          quantity: 1,
          selectedSpecs: [],
          process: [
            { name: '备料', sort: 1, done: false },
            { name: '烘烤', sort: 2, done: false },
            { name: '装盘', sort: 3, done: false },
          ],
        },
      ]),
    },
  })
  console.log('Mock 订单数据已创建（共8笔订单）')

  console.log('\n种子数据填充完成!')
  console.log('管理员账号: admin@example.com / admin123')
  console.log('测试顾客: 13800138001 / 123456 (张小明)')
  console.log('测试顾客: 13800138002 / 123456 (李咖啡)')
  console.log('测试顾客: 13800138003 / 123456 (王烘焙)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
