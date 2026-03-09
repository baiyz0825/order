import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'

export async function getSessionId(): Promise<string> {
  const cookieStore = await cookies()
  let sessionId = cookieStore.get('session_id')?.value
  if (!sessionId) {
    sessionId = uuidv4()
    cookieStore.set('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60,
    })
  }
  return sessionId
}
