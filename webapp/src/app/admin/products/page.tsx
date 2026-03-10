'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

/* ---------- 类型定义 ---------- */

interface Category {
  id: number
  name: string
  sort: number
  isActive: boolean
  processTemplateId: number | null
}

interface SpecTemplate {
  id: number
  name: string
  type: string
  options: string
}

interface ProcessTemplate {
  id: number
  name: string
  steps: string
}

interface Product {
  id: number
  categoryId: number
  category: Category
  name: string
  description: string
  price: number // 分
  imageUrl: string
  isOnSale: boolean
  sort: number
  specs: string // JSON 字符串
  processTemplateId: number | null
  createdAt: string
  updatedAt: string
}

interface SpecRow {
  templateId: number
  required: boolean
  overrideOptions: null
}

/* ---------- 常量 ---------- */

const EMPTY_FORM = {
  name: '',
  categoryId: 0,
  price: '',
  description: '',
  imageUrl: '',
  specs: [] as SpecRow[],
  processTemplateId: null as number | null,
  sort: 0,
}

/* ========== 主组件 ========== */

export default function AdminProductsPage() {
  /* --- 列表相关 --- */
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  /* --- 弹窗相关 --- */
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* --- 下拉数据 --- */
  const [categories, setCategories] = useState<Category[]>([])
  const [specTemplates, setSpecTemplates] = useState<SpecTemplate[]>([])
  const [processTemplates, setProcessTemplates] = useState<ProcessTemplate[]>([])

  /* ---------- 拉取商品列表 ---------- */

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/products')
      if (res.ok) {
        const data: Product[] = await res.json()
        setProducts(data)
      }
    } catch (err) {
      console.error('获取商品列表失败', err)
    } finally {
      setLoading(false)
    }
  }, [])

  /* ---------- 拉取下拉数据 ---------- */

  const fetchDropdowns = useCallback(async () => {
    try {
      const [catRes, specRes, procRes] = await Promise.all([
        fetch('/api/admin/categories'),
        fetch('/api/admin/specs'),
        fetch('/api/admin/process'),
      ])
      if (catRes.ok) setCategories(await catRes.json())
      if (specRes.ok) setSpecTemplates(await specRes.json())
      if (procRes.ok) setProcessTemplates(await procRes.json())
    } catch (err) {
      console.error('获取下拉数据失败', err)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
    fetchDropdowns()
  }, [fetchProducts, fetchDropdowns])

  /* ---------- 前端搜索过滤 ---------- */

  const filtered = search.trim()
    ? products.filter((p) => p.name.includes(search.trim()))
    : products

  /* ---------- 上下架切换 ---------- */

  const handleToggle = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/products/${id}/toggle`, {
        method: 'POST',
      })
      if (res.ok) {
        const updated: Product = await res.json()
        setProducts((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, isOnSale: updated.isOnSale } : p,
          ),
        )
      }
    } catch (err) {
      console.error('切换上下架失败', err)
    }
  }

  /* ---------- 打开新增弹窗 ---------- */

  const openCreate = () => {
    setEditingId(null)
    setForm({
      ...EMPTY_FORM,
      categoryId: categories.length > 0 ? categories[0].id : 0,
    })
    setShowModal(true)
  }

  /* ---------- 打开编辑弹窗 ---------- */

  const openEdit = (product: Product) => {
    setEditingId(product.id)

    let parsedSpecs: SpecRow[] = []
    try {
      parsedSpecs = JSON.parse(product.specs || '[]')
    } catch {
      /* ignore */
    }

    setForm({
      name: product.name,
      categoryId: product.categoryId,
      price: (product.price / 100).toString(),
      description: product.description,
      imageUrl: product.imageUrl,
      specs: parsedSpecs,
      processTemplateId: product.processTemplateId,
      sort: product.sort,
    })
    setShowModal(true)
  }

  /* ---------- 关闭弹窗 ---------- */

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  /* ---------- 图片上传 ---------- */

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        const data = await res.json()
        setForm((prev) => ({ ...prev, imageUrl: data.url }))
      }
    } catch (err) {
      console.error('图片上传失败', err)
    } finally {
      setUploading(false)
      // 重置 input 以允许选择相同文件
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  /* ---------- 规格操作 ---------- */

  const addSpec = () => {
    setForm((prev) => ({
      ...prev,
      specs: [
        ...prev.specs,
        {
          templateId: specTemplates.length > 0 ? specTemplates[0].id : 0,
          required: false,
          overrideOptions: null,
        },
      ],
    }))
  }

  const removeSpec = (index: number) => {
    setForm((prev) => ({
      ...prev,
      specs: prev.specs.filter((_, i) => i !== index),
    }))
  }

  const updateSpec = (
    index: number,
    field: 'templateId' | 'required',
    value: number | boolean,
  ) => {
    setForm((prev) => ({
      ...prev,
      specs: prev.specs.map((s, i) =>
        i === index ? { ...s, [field]: value } : s,
      ),
    }))
  }

  /* ---------- 保存（新增 / 编辑） ---------- */

  const handleSave = async () => {
    if (!form.name.trim()) return alert('请输入商品名称')
    if (!form.categoryId) return alert('请选择分类')
    if (!form.price || Number(form.price) <= 0) return alert('请输入有效价格')

    setSaving(true)
    try {
      const priceInFen = Math.round(Number(form.price) * 100)

      const payload = {
        name: form.name.trim(),
        categoryId: form.categoryId,
        price: priceInFen,
        description: form.description.trim(),
        imageUrl: form.imageUrl,
        specs: JSON.stringify(form.specs),
        processTemplateId: form.processTemplateId,
        sort: form.sort,
      }

      const url = editingId
        ? `/api/admin/products/${editingId}`
        : '/api/admin/products'

      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        closeModal()
        fetchProducts()
      } else {
        const data = await res.json()
        alert(data.error || '保存失败')
      }
    } catch (err) {
      console.error('保存失败', err)
      alert('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  /* ========== 渲染 ========== */

  return (
    <div className="min-h-screen bg-ios-bg">
      {/* ---- 顶部标题栏 ---- */}
      <header className="sticky top-0 z-30 border-b border-border-color bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-center px-4 py-3">
          <h1 className="text-lg font-semibold text-text-main">商品管理</h1>
        </div>
      </header>

      {/* ---- 搜索框 ---- */}
      <div className="mx-auto max-w-lg px-4 pt-3 pb-2">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-light">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="搜索商品名称..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border-none bg-white py-2.5 pl-9 pr-4 text-sm text-text-main placeholder:text-text-light outline-none shadow-sm"
          />
        </div>
      </div>

      {/* ---- 商品列表 ---- */}
      <div className="mx-auto max-w-lg px-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-text-secondary">
            加载中...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-sm text-text-secondary">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mb-3 text-text-light"
            >
              <path d="m7.5 4.27 9 5.15" />
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <path d="m3.3 7 8.7 5 8.7-5" />
              <path d="M12 22V12" />
            </svg>
            {search ? '没有匹配的商品' : '暂无商品，点击下方按钮添加'}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm"
              >
                {/* 商品图片 */}
                <div className="h-[60px] w-[60px] flex-shrink-0 overflow-hidden rounded-lg bg-ios-bg">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-text-light">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                        <circle cx="9" cy="9" r="2" />
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* 商品信息 */}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-medium text-text-main">
                    {product.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    {product.category?.name || '未分类'}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-primary">
                    ¥{(product.price / 100).toFixed(2)}
                  </p>
                </div>

                {/* 右侧操作区 */}
                <div className="flex flex-shrink-0 flex-col items-end gap-2">
                  {/* 上下架开关 */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={product.isOnSale}
                    onClick={() => handleToggle(product.id)}
                    className={`relative inline-flex h-[26px] w-[46px] items-center rounded-full transition-colors ${
                      product.isOnSale ? 'bg-success-green' : 'bg-text-light'
                    }`}
                  >
                    <span
                      className={`inline-block h-[22px] w-[22px] transform rounded-full bg-white shadow-sm transition-transform ${
                        product.isOnSale ? 'translate-x-[22px]' : 'translate-x-[2px]'
                      }`}
                    />
                  </button>

                  {/* 编辑按钮 */}
                  <button
                    type="button"
                    onClick={() => openEdit(product)}
                    className="rounded-md px-2.5 py-1 text-xs text-primary transition-colors active:bg-primary/10"
                  >
                    编辑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- 底部浮动按钮 ---- */}
      <div className="fixed bottom-16 left-0 right-0 z-20 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-lg px-4 py-3">
          <button
            type="button"
            onClick={openCreate}
            className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-white shadow-lg transition-opacity active:opacity-80"
          >
            添加新商品
          </button>
        </div>
      </div>

      {/* ======== 编辑 / 新增弹窗 ======== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* 遮罩 */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeModal}
          />

          {/* 弹窗内容 */}
          <div className="relative flex h-[90vh] w-full max-w-lg flex-col rounded-t-2xl bg-white">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between border-b border-border-color px-4 py-3">
              <h2 className="text-base font-semibold text-text-main">
                {editingId ? '编辑商品' : '新增商品'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors active:bg-ios-bg"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            {/* 弹窗可滚动区域 */}
            <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
              <div className="space-y-5">
                {/* ---- 图片上传 ---- */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-main">
                    商品图片
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border-color bg-ios-bg transition-colors active:bg-border-color"
                  >
                    {uploading ? (
                      <span className="text-xs text-text-secondary">
                        上传中...
                      </span>
                    ) : form.imageUrl ? (
                      <img
                        src={form.imageUrl}
                        alt="商品图片"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-text-light">
                        <svg
                          width="28"
                          height="28"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span className="mt-1 text-xs">点击上传</span>
                      </div>
                    )}
                  </button>
                </div>

                {/* ---- 商品名称 ---- */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-main">
                    商品名称 <span className="text-danger-red">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="请输入商品名称"
                    className="w-full rounded-lg border border-border-color bg-ios-bg px-3 py-2.5 text-sm text-text-main placeholder:text-text-light outline-none transition-colors focus:border-primary"
                  />
                </div>

                {/* ---- 分类选择 ---- */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-main">
                    所属分类 <span className="text-danger-red">*</span>
                  </label>
                  <select
                    value={form.categoryId}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        categoryId: Number(e.target.value),
                      }))
                    }
                    className="w-full appearance-none rounded-lg border border-border-color bg-ios-bg px-3 py-2.5 text-sm text-text-main outline-none transition-colors focus:border-primary"
                  >
                    <option value={0} disabled>
                      请选择分类
                    </option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ---- 价格 ---- */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-main">
                    价格（元） <span className="text-danger-red">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, price: e.target.value }))
                    }
                    placeholder="0.00"
                    className="w-full rounded-lg border border-border-color bg-ios-bg px-3 py-2.5 text-sm text-text-main placeholder:text-text-light outline-none transition-colors focus:border-primary"
                  />
                </div>

                {/* ---- 描述 ---- */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-main">
                    商品描述
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="请输入商品描述"
                    rows={3}
                    className="w-full resize-none rounded-lg border border-border-color bg-ios-bg px-3 py-2.5 text-sm text-text-main placeholder:text-text-light outline-none transition-colors focus:border-primary"
                  />
                </div>

                {/* ---- 规格设置 ---- */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-sm font-medium text-text-main">
                      规格设置
                    </label>
                    <button
                      type="button"
                      onClick={addSpec}
                      className="text-xs text-primary transition-opacity active:opacity-70"
                    >
                      + 添加规格
                    </button>
                  </div>

                  {form.specs.length === 0 ? (
                    <p className="py-3 text-center text-xs text-text-light">
                      暂无规格，点击右上方添加
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {form.specs.map((spec, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 rounded-lg border border-border-color bg-ios-bg p-2.5"
                        >
                          {/* 模板选择 */}
                          <select
                            value={spec.templateId}
                            onChange={(e) =>
                              updateSpec(
                                index,
                                'templateId',
                                Number(e.target.value),
                              )
                            }
                            className="min-w-0 flex-1 appearance-none rounded-md border border-border-color bg-white px-2 py-1.5 text-xs text-text-main outline-none focus:border-primary"
                          >
                            {specTemplates.map((st) => (
                              <option key={st.id} value={st.id}>
                                {st.name}
                              </option>
                            ))}
                          </select>

                          {/* 是否必选 toggle */}
                          <button
                            type="button"
                            role="switch"
                            aria-checked={spec.required}
                            onClick={() =>
                              updateSpec(index, 'required', !spec.required)
                            }
                            className={`relative inline-flex h-[22px] w-[38px] flex-shrink-0 items-center rounded-full transition-colors ${
                              spec.required
                                ? 'bg-success-green'
                                : 'bg-text-light'
                            }`}
                            title="必选"
                          >
                            <span
                              className={`inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow-sm transition-transform ${
                                spec.required
                                  ? 'translate-x-[18px]'
                                  : 'translate-x-[2px]'
                              }`}
                            />
                          </button>
                          <span className="flex-shrink-0 text-xs text-text-secondary">
                            必选
                          </span>

                          {/* 删除按钮 */}
                          <button
                            type="button"
                            onClick={() => removeSpec(index)}
                            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-danger-red transition-colors active:bg-danger-red/10"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M18 6 6 18" />
                              <path d="m6 6 12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ---- 制作流程 ---- */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-main">
                    制作流程
                  </label>
                  <select
                    value={form.processTemplateId ?? ''}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        processTemplateId: e.target.value
                          ? Number(e.target.value)
                          : null,
                      }))
                    }
                    className="w-full appearance-none rounded-lg border border-border-color bg-ios-bg px-3 py-2.5 text-sm text-text-main outline-none transition-colors focus:border-primary"
                  >
                    <option value="">继承分类</option>
                    {processTemplates.map((pt) => (
                      <option key={pt.id} value={pt.id}>
                        {pt.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ---- 排序 ---- */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-main">
                    排序
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.sort}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        sort: Number(e.target.value) || 0,
                      }))
                    }
                    placeholder="数字越小越靠前"
                    className="w-full rounded-lg border border-border-color bg-ios-bg px-3 py-2.5 text-sm text-text-main placeholder:text-text-light outline-none transition-colors focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* 弹窗底部按钮 */}
            <div className="border-t border-border-color px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-white transition-opacity disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
