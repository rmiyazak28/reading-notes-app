"use server"

import { createClient } from "@/lib/supabase/server"

type ActionError = {
  code: "UNAUTHORIZED" | "VALIDATION" | "DB_ERROR" | "UNKNOWN"
  message: string
}

type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: ActionError }

type SignUpInput = {
  name: string
  email: string
  password: string
}

type SignInInput = {
  email: string
  password: string
}

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

export async function signInWithGoogle(): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
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
