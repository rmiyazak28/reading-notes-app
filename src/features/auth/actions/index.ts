"use server"

import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { z } from "zod"
import type { ActionResult } from "@/types/actions"

/** {@link signUpWithEmail} の入力型 */
type SignUpInput = {
  name: string
  email: string
  password: string
}

const signUpSchema = z.object({
  name: z.string().min(1, "ユーザー名は必須です"),
  email: z.string().email("メール形式で入力してください"),
  password: z
    .string()
    .min(8, "パスワードは8文字以上で入力してください")
    .max(72, "パスワードは72文字以内で入力してください")
    .regex(/[a-zA-Z]/, "英字を1文字以上含めてください")
    .regex(/[0-9]/, "数字を1文字以上含めてください"),
})

/** {@link signInWithEmail} の入力型 */
type SignInInput = {
  email: string
  password: string
}

const signInSchema = z.object({
  email: z.string().email("メール形式で入力してください"),
  password: z.string().min(1, "パスワードは必須です"),
})

/**
 * メールアドレスとパスワードで新規ユーザーを登録する。
 * @param input - ユーザー名・メールアドレス・パスワード
 * @returns 成功時は `data: undefined`、失敗時は `error` オブジェクト
 * @remarks Supabase のメール確認が有効な場合、登録後に確認メールが送信される
 */
export async function signUpWithEmail(input: SignUpInput): Promise<ActionResult<void>> {
  const parsed = signUpSchema.safeParse(input)
  if (!parsed.success) {
    return { data: null, error: { code: "VALIDATION", message: parsed.error.issues[0].message } }
  }

  const supabase = await createClient()

  // ユーザー列挙防止: 登録済みメールアドレスでもエラーを返さない。
  // Supabase は登録済みの場合、既存ユーザーへ別途通知メールを送信する。
  await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { name: input.name },
    },
  })

  return { data: undefined, error: null }
}

/**
 * メールアドレスとパスワードでログインする。
 * @param input - メールアドレス・パスワード
 * @returns 成功時は `data: undefined`、失敗時は `error` オブジェクト
 */
export async function signInWithEmail(input: SignInInput): Promise<ActionResult<void>> {
  const parsed = signInSchema.safeParse(input)
  if (!parsed.success) {
    return { data: null, error: { code: "VALIDATION", message: parsed.error.issues[0].message } }
  }

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

const updateProfileSchema = z
  .object({
    name: z.string().optional(),
    email: z.string().email("メール形式で入力してください").optional(),
    password: z
      .string()
      .min(8, "パスワードは8文字以上で入力してください")
      .max(72, "パスワードは72文字以内で入力してください")
      .regex(/[a-zA-Z]/, "英字を1文字以上含めてください")
      .regex(/[0-9]/, "数字を1文字以上含めてください")
      .optional(),
    passwordConfirm: z.string().optional(),
  })
  .refine(
    (v) => !v.password || v.password === v.passwordConfirm,
    { message: "パスワードが一致しません", path: ["passwordConfirm"] }
  )

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

/**
 * ユーザー情報（名前・メールアドレス・パスワード）を更新する。
 */
export async function updateProfile(input: UpdateProfileInput): Promise<ActionResult<void>> {
  const parsed = updateProfileSchema.safeParse(input)
  if (!parsed.success) {
    return { data: null, error: { code: "VALIDATION", message: parsed.error.issues[0].message } }
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { data: null, error: { code: "UNAUTHORIZED", message: "ログインが必要です" } }
  }

  const { name, email, password } = parsed.data

  try {
    // email 以外（name / password）は通常の updateUser で更新する
    if (name !== undefined || password) {
      const updateData: Parameters<typeof supabase.auth.updateUser>[0] = {}
      if (name !== undefined) updateData.data = { name }
      if (password) updateData.password = password

      const { error } = await supabase.auth.updateUser(updateData)
      if (error) {
        if (password && error.message.toLowerCase().includes("different from the old password")) {
          return { data: null, error: { code: "VALIDATION", message: "現在と異なるパスワードを入力してください" } }
        }
        return { data: null, error: { code: "DB_ERROR", message: "処理に失敗しました" } }
      }

      // updateUser 後もクッキーの JWT クレームは古いままのため、
      // セッションを再取得してクッキーを最新の user_metadata で上書きする
      if (name !== undefined) {
        await supabase.auth.refreshSession()
      }
    }

    // Secure Email Change: 新メールアドレスへ確認リンクを送信し、クリック後に変更が反映される
    if (email) {
      const { error } = await supabase.auth.updateUser({ email })
      if (error) {
        return { data: null, error: { code: "DB_ERROR", message: "処理に失敗しました" } }
      }
    }
  } catch {
    return { data: null, error: { code: "UNKNOWN", message: "処理に失敗しました" } }
  }

  return { data: undefined, error: null }
}

/**
 * アカウントを削除する。Supabase Admin API を使用するため SUPABASE_SERVICE_ROLE_KEY が必要。
 * books / reading_memos / tags は DB CASCADE DELETE で連鎖削除される。
 */
export async function deleteAccount(): Promise<ActionResult<void>> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { data: null, error: { code: "UNAUTHORIZED", message: "ログインが必要です" } }
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceRoleKey || !supabaseUrl) {
    return { data: null, error: { code: "UNKNOWN", message: "サーバー設定が不正です" } }
  }

  // Secret Key はサーバーサイドのみで使用し、クライアントには露出しない
  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error } = await adminClient.auth.admin.deleteUser(user.id)
  if (error) {
    return { data: null, error: { code: "DB_ERROR", message: "処理に失敗しました" } }
  }

  await supabase.auth.signOut()
  return { data: undefined, error: null }
}
