import { NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'

export async function GET() {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }
  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  })
}
