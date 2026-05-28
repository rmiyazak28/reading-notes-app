import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  if (code) {
    const supabase = await createClient()
    // Google OAuth がリダイレクトしてくる認可コードをセッション Cookie に交換する。
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // 交換成功後、認証済みユーザーの起点となる /home へ送る。
      return NextResponse.redirect(`${origin}/home`)
    }
  }

  // コード未取得・交換失敗時は /login へ戻してフローをリセットする。
  return NextResponse.redirect(`${origin}/login`)
}
