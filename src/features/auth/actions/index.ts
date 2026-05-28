"use server"

import { createClient } from "@/lib/supabase/server"

/** Server Actions が返す統一エラー型 */
type ActionError = {
  code: "UNAUTHORIZED" | "VALIDATION" | "DB_ERROR" | "UNKNOWN"
  message: string
}

/**
 * Server Actions の統一戻り値型。
 * 成功時は data に結果、error は null。失敗時はその逆。
 */
type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: ActionError }

/** {@link signUpWithEmail} の入力型 */
type SignUpInput = {
  name: string
  email: string
  password: string
}

/** {@link signInWithEmail} の入力型 */
type SignInInput = {
  email: string
  password: string
}

/**
 * メールアドレスとパスワードで新規ユーザーを登録する。
 * @param input - ユーザー名・メールアドレス・パスワード
 * @returns 成功時は `data: undefined`、失敗時は `error` オブジェクト
 * @remarks Supabase のメール確認が有効な場合、登録後に確認メールが送信される
 */
export async function signUpWithEmail(input: SignUpInput): Promise<ActionResult<void>> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { name: input.name },
    },
  })

  if (error) {
    return { data: null, error: { code: "DB_ERROR", message: error.message } }
  }

  return { data: undefined, error: null }
}

/**
 * メールアドレスとパスワードでログインする。
 * @param input - メールアドレス・パスワード
 * @returns 成功時は `data: undefined`、失敗時は `error` オブジェクト
 */
export async function signInWithEmail(input: SignInInput): Promise<ActionResult<void>> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  })

  if (error) {
    return { data: null, error: { code: "UNAUTHORIZED", message: error.message } }
  }

  return { data: undefined, error: null }
}

/**
 * Google OAuth でログインするための認証 URL を返す。
 * @returns 成功時は Google OAuth の認証 URL、失敗時は `error` オブジェクト
 * @remarks
 * Server Actions はサーバーで実行されるためブラウザリダイレクトが不可能。
 * そのため URL を返し、呼び出し元（Client Component）で `window.location.href` に代入させる。
 * @see {@link signInWithGoogle} のコールバック先 → `/api/auth/callback/route.ts`
 */
export async function signInWithGoogle(): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      // Server Actions はサーバーで実行されるためブラウザリダイレクト不可。
      // true にして自動遷移を抑制し、URL をクライアントに返す。
      skipBrowserRedirect: true,
    },
  })

  if (error) {
    return { data: null, error: { code: "UNKNOWN", message: error.message } }
  }

  if (!data.url) {
    return { data: null, error: { code: "UNKNOWN", message: "URLの取得に失敗しました" } }
  }

  return { data: { url: data.url }, error: null }
}

/**
 * ログアウトする。
 * @returns 成功時は `data: undefined`、失敗時は `error` オブジェクト
 */
export async function signOut(): Promise<ActionResult<void>> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    return { data: null, error: { code: "UNKNOWN", message: error.message } }
  }

  return { data: undefined, error: null }
}
