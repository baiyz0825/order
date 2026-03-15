'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 表单数据
  const [formData, setFormData] = useState({
    // 步骤1：管理员账户
    admin: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
    },
    // 步骤2：店铺信息
    shopInfo: {
      shopName: '',
      shopSubtitle: '',
      businessHours: '每日 08:00 - 22:00',
      address: '',
      contactInfo: '',
    },
    // 步骤3：首页内容
    homeContent: {
      homeWelcomeText: '欢迎光临！',
      homeAnnouncementText: '',
    },
    // 步骤4：测试数据
    seedTestData: false,
  })

  const updateForm = (section: string, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value,
      },
    }))
  }

  const validateStep = (currentStep: number): boolean => {
    setError('')

    if (currentStep === 1) {
      const { email, password, confirmPassword, name } = formData.admin
      if (!email || !password || !name) {
        setError('请填写所有必填项')
        return false
      }
      if (password.length < 8) {
        setError('密码长度至少为8个字符')
        return false
      }
      if (password !== confirmPassword) {
        setError('两次输入的密码不一致')
        return false
      }
      if (!email.includes('@')) {
        setError('请输入有效的邮箱地址')
        return false
      }
    }

    if (currentStep === 2) {
      const { shopName } = formData.shopInfo
      if (!shopName.trim()) {
        setError('店铺名称不能为空')
        return false
      }
    }

    return true
  }

  const nextStep = () => {
    if (!validateStep(step)) return
    setStep((prev) => Math.min(prev + 1, 4))
  }

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1))
    setError('')
  }

  const handleSubmit = async () => {
    if (!validateStep(step)) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin: {
            email: formData.admin.email,
            password: formData.admin.password,
            name: formData.admin.name,
          },
          shopInfo: formData.shopInfo,
          homeContent: formData.homeContent,
          seedTestData: formData.seedTestData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '初始化失败')
        return
      }

      // 初始化成功，跳转到登录页
      router.push('/admin/login?initialized=true')
    } catch (err) {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { num: 1, title: '创建管理员' },
    { num: 2, title: '店铺信息' },
    { num: 3, title: '首页内容' },
    { num: 4, title: '完成' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 步骤指示器 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= s.num
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {s.num}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`w-12 h-1 mx-1 ${
                      step > s.num ? 'bg-amber-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>管理员</span>
            <span>店铺</span>
            <span>首页</span>
            <span>完成</span>
          </div>
        </div>

        {/* 表单卡片 */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            系统初始化
          </h1>
          <p className="text-gray-600 mb-6">
            {step === 1 && '创建您的管理员账户'}
            {step === 2 && '配置店铺基本信息'}
            {step === 3 && '设置首页欢迎内容'}
            {step === 4 && '选择是否填充测试数据'}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* 步骤1：管理员账户 */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  邮箱 *
                </label>
                <input
                  type="email"
                  value={formData.admin.email}
                  onChange={(e) =>
                    updateForm('admin', 'email', e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="admin@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  姓名 *
                </label>
                <input
                  type="text"
                  value={formData.admin.name}
                  onChange={(e) =>
                    updateForm('admin', 'name', e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="店长"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  密码 *（至少8个字符）
                </label>
                <input
                  type="password"
                  value={formData.admin.password}
                  onChange={(e) =>
                    updateForm('admin', 'password', e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  确认密码 *
                </label>
                <input
                  type="password"
                  value={formData.admin.confirmPassword}
                  onChange={(e) =>
                    updateForm('admin', 'confirmPassword', e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

          {/* 步骤2：店铺信息 */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  店铺名称 *
                </label>
                <input
                  type="text"
                  value={formData.shopInfo.shopName}
                  onChange={(e) =>
                    updateForm('shopInfo', 'shopName', e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="精品咖啡烘焙店"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  副标题
                </label>
                <input
                  type="text"
                  value={formData.shopInfo.shopSubtitle}
                  onChange={(e) =>
                    updateForm('shopInfo', 'shopSubtitle', e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="专注手冲与手工烘焙"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  营业时间
                </label>
                <input
                  type="text"
                  value={formData.shopInfo.businessHours}
                  onChange={(e) =>
                    updateForm('shopInfo', 'businessHours', e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="每日 08:00 - 22:00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  地址
                </label>
                <input
                  type="text"
                  value={formData.shopInfo.address}
                  onChange={(e) =>
                    updateForm('shopInfo', 'address', e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="xx市xx区xx路xx号"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  联系方式
                </label>
                <input
                  type="text"
                  value={formData.shopInfo.contactInfo}
                  onChange={(e) =>
                    updateForm('shopInfo', 'contactInfo', e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="电话：xxx-xxxx-xxxx"
                />
              </div>
            </div>
          )}

          {/* 步骤3：首页内容 */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  欢迎语
                </label>
                <textarea
                  value={formData.homeContent.homeWelcomeText}
                  onChange={(e) =>
                    updateForm('homeContent', 'homeWelcomeText', e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  rows={3}
                  placeholder="欢迎光临我们的店铺..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  公告文字
                </label>
                <textarea
                  value={formData.homeContent.homeAnnouncementText}
                  onChange={(e) =>
                    updateForm('homeContent', 'homeAnnouncementText', e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  rows={3}
                  placeholder="新品上市，欢迎品尝..."
                />
              </div>
            </div>
          )}

          {/* 步骤4：测试数据 */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.seedTestData}
                    onChange={(e) =>
                      updateForm('seedTestData', '', e.target.checked)
                    }
                    className="mt-1 w-5 h-5 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                  />
                  <div>
                    <div className="font-medium text-gray-800">
                      是的，填充测试数据（推荐新用户）
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      自动创建示例商品、分类、规格模板等，帮助您快速了解系统功能
                    </div>
                  </div>
                </label>
              </div>

              <div className="text-sm text-gray-600">
                <p className="font-medium mb-2">测试数据包括：</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>3个示例分类（咖啡饮品、手工烘焙、轻食简餐）</li>
                  <li>多个示例商品（美式咖啡、拿铁、提拉米苏等）</li>
                  <li>商品规格模板（尺寸、温度等）</li>
                </ul>
              </div>
            </div>
          )}

          {/* 导航按钮 */}
          <div className="mt-8 flex justify-between">
            {step > 1 ? (
              <button
                onClick={prevStep}
                disabled={loading}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一步
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                onClick={nextStep}
                disabled={loading}
                className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一步 →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '初始化中...' : '完成初始化'}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-gray-600 text-sm mt-6">
          初始化完成后，您可以使用管理员账户登录系统
        </p>
      </div>
    </div>
  )
}
