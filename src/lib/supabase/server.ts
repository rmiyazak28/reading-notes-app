// Server Component / Server Actions / Route Handler 専用。
// ブラウザ環境では client.ts の createClient() を使うこと。
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component から呼ばれた場合、レスポンス送信後のため Cookie を書き込めない。
            // セッションリフレッシュは Middleware（proxy.ts）が担うため、ここで握り潰して問題ない。
          }
        },
      },
    }
  )
}