import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('开始填充种子数据...')

  // 1. 创建管理员
  const hashedPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: '店长',
      role: 'admin',
    },
  })
  console.log(`管理员已创建: ${admin.email}`)

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
  await prisma.product.createMany({
    data: [
      {
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
      {
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
      {
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
      {
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
      {
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
      {
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
    ],
  })
  console.log('示例商品已创建')

  console.log('\n种子数据填充完成!')
  console.log('管理员账号: admin@example.com')
  console.log('管理员密码: admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
