import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { EmailOtpType } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null

  const supabase = await createClient()

  if (code) {
    // Google OAuth がリダイレクトしてくる認可コードをセッション Cookie に交換する。
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}/home`)
    }
  }

  if (tokenHash && type) {
    // メールアドレス変更・サインアップ確認など OTP ベースのメールリンクを処理する。
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (!error) {
      return NextResponse.redirect(`${origin}/settings`)
    }
  }

  // コード未取得・検証失敗時は /login へ戻してフローをリセットする。
  return NextResponse.redirect(`${origin}/login`)
}
