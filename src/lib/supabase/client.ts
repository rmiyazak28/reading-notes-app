// Client Component・ブラウザ環境専用。
// サーバー環境（Server Component / Server Actions / Middleware）では server.ts の createClient() を使うこと。
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}