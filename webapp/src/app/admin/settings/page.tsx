'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminConfigTabs from '@/components/AdminConfigTabs'

interface ShopSettings {
  shopName: string
  shopSubtitle: string
  aboutText: string
  businessHours: string
  address: string
  contactInfo: string
  homeWelcomeText: string
  homeAnnouncementText: string
  homeBannerUrl: string
}

const fieldLabels: Record<keyof ShopSettings, string> = {
  shopName: '店铺名称',
  shopSubtitle: '店铺副标题',
  homeWelcomeText: '首页欢迎语',
  homeAnnouncementText: '首页公告',
  homeBannerUrl: '首页横幅图片URL',
  aboutText: '关于我们',
  businessHours: '营业时间',
  address: '店铺地址',
  contactInfo: '联系方式',
}

const fieldPlaceholders: Record<keyof ShopSettings, string> = {
  shopName: '请输入店铺名称',
  shopSubtitle: '请输入副标题/口号',
  homeWelcomeText: '请输入首页欢迎语',
  homeAnnouncementText: '请输入公告内容（留空则不显示）',
  homeBannerUrl: '请输入横幅图片URL（留空则不显示）',
  aboutText: '请输入店铺介绍',
  businessHours: '例如：每日 08:00 - 22:00',
  address: '请输入店铺地址',
  contactInfo: '请输入联系方式（电话/微信等）',
}

// 使用 textarea 的字段
const textareaFields: (keyof ShopSettings)[] = ['aboutText', 'homeAnnouncementText']

// 字段分组
const fieldGroups: { title: string; fields: (keyof ShopSettings)[] }[] = [
  {
    title: '基本信息',
    fields: ['shopName', 'shopSubtitle', 'businessHours', 'address', 'contactInfo'],
  },
  {
    title: '首页配置',
    fields: ['homeWelcomeText', 'homeAnnouncementText', 'homeBannerUrl'],
  },
  {
    title: '关于我们',
    fields: ['aboutText'],
  },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<ShopSettings>({
    shopName: '',
    shopSubtitle: '',
    aboutText: '',
    businessHours: '',
    address: '',
    contactInfo: '',
    homeWelcomeText: '',
    homeAnnouncementText: '',
    homeBannerUrl: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [resetPassword, setResetPassword] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState('')

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
      }
    } catch (err) {
      console.error('获取店铺设置失败:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch (err) {
      console.error('保存店铺设置失败:', err)
    } finally {
      setSaving(false)
    }
  }

  const updateField = (key: keyof ShopSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleReset = async () => {
    if (!resetPassword) {
      setResetError('请输入密码')
      return
    }

    setResetting(true)
    setResetError('')

    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmPassword: resetPassword }),
      })

      if (res.ok) {
        // 重置成功，刷新页面
        window.location.href = '/admin/setup'
      } else {
        const data = await res.json()
        setResetError(data.error || '重置失败')
      }
    } catch (err) {
      setResetError('网络错误，请重试')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="min-h-screen bg-ios-bg">
      <AdminConfigTabs />

      <div className="px-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-text-secondary text-sm">
            加载中...
          </div>
        ) : (
          <div className="space-y-6">
            {fieldGroups.map((group) => (
              <div key={group.title}>
                <h3 className="mb-3 text-sm font-medium text-text-secondary px-1">
                  {group.title}
                </h3>
                <div className="space-y-4">
                  {group.fields.map((key) => (
                    <div key={key} className="rounded-xl bg-white p-4">
                      <label className="mb-2 block text-sm font-medium text-text-main">
                        {fieldLabels[key]}
                      </label>
                      {textareaFields.includes(key) ? (
                        <textarea
                          value={settings[key]}
                          onChange={(e) => updateField(key, e.target.value)}
                          placeholder={fieldPlaceholders[key]}
                          rows={4}
                          className="w-full rounded-xl border border-border-color bg-ios-bg px-4 py-3 text-sm text-text-main placeholder:text-text-light outline-none focus:border-primary resize-none"
                        />
                      ) : (
                        <input
                          type="text"
                          value={settings[key]}
                          onChange={(e) => updateField(key, e.target.value)}
                          placeholder={fieldPlaceholders[key]}
                          className="w-full rounded-xl border border-border-color bg-ios-bg px-4 py-3 text-sm text-text-main placeholder:text-text-light outline-none focus:border-primary"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-white transition-opacity disabled:opacity-50"
            >
              {saving ? '保存中...' : saved ? '✓ 已保存' : '保存设置'}
            </button>

            {/* 危险操作区域 */}
            <div className="mt-8 rounded-xl bg-red-50 p-4">
              <h3 className="mb-3 text-sm font-medium text-red-800 px-1">
                危险操作
              </h3>
              <button
                onClick={() => setShowResetDialog(true)}
                className="w-full rounded-xl border-2 border-red-300 bg-white py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                重置系统
              </button>
              <p className="mt-2 text-xs text-red-600 px-1">
                ⚠️ 警告：此操作将清空所有数据，包括商品、订单、用户等，且不可恢复！
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 重置确认对话框 */}
      {showResetDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              确认重置系统
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              此操作将清空所有数据，包括：
            </p>
            <ul className="text-sm text-gray-600 mb-4 space-y-1 list-disc list-inside">
              <li>所有用户（包括管理员）</li>
              <li>所有商品和分类</li>
              <li>所有订单数据</li>
              <li>所有设置和配置</li>
            </ul>
            <p className="text-red-600 text-sm font-medium mb-4">
              ⚠️ 此操作不可撤销，请谨慎操作！
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                请输入当前密码以确认
              </label>
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="••••••••"
              />
              {resetError && (
                <p className="mt-1 text-sm text-red-600">{resetError}</p>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowResetDialog(false)
                  setResetPassword('')
                  setResetError('')
                }}
                disabled={resetting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {resetting ? '重置中...' : '确认重置'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
