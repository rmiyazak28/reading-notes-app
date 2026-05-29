import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // createServerClient と getClaims() の間にコードを挟まない。
  // Cookie の setAll が呼ばれる前に他の処理が割り込むとセッション更新が壊れる。

  // getSession() はローカル Cookie をそのまま信頼するため偽装可能。
  // getUser() は毎回 Supabase サーバーへ API リクエストを送るため低速。
  // getClaims() は JWT 署名をローカルで検証するだけなので安全かつ高速。
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  // 未認証ユーザーを /login へリダイレクト
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/signup') &&
    !request.nextUrl.pathname.startsWith('/api/auth')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // supabaseResponse をそのまま返すこと
  // 新しいResponseを作る場合は cookies をコピーしないとセッションが壊れる
  return supabaseResponse
}