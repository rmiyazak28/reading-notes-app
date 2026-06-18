/**
 * E2Eテスト用 Supabase データ操作ヘルパー。
 * テストユーザーの認証情報でサインインし、beforeEach でデータ作成・afterEach で削除する用途に使う。
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
const EMAIL = process.env.E2E_TEST_EMAIL!
const PASSWORD = process.env.E2E_TEST_PASSWORD!

export type TestSupabaseClient = SupabaseClient

/** テストユーザーでサインインした Supabase クライアントを返す */
export async function createTestDb(): Promise<TestSupabaseClient> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const { error } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
  if (error) throw new Error(`テストDB認証失敗: ${error.message}`)
  return supabase
}

export interface TestBook {
  id: string
  title: string
  status: string
}

export interface TestMemo {
  id: string
  content: string
  favorite: boolean
  book_id: string
}

/** テスト用書籍を作成する */
export async function createTestBook(
  supabase: TestSupabaseClient,
  opts: { title?: string; status?: "unread" | "reading" | "completed"; author?: string } = {}
): Promise<TestBook> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("未認証")

  const title = opts.title ?? `E2E_書籍_${Date.now()}`
  const status = opts.status ?? "reading"

  const { data, error } = await supabase
    .from("books")
    .insert({ user_id: user.id, title, status, author: opts.author ?? null })
    .select("id, title, status")
    .single()

  if (error) throw new Error(`書籍作成失敗: ${error.message}`)
  return data as TestBook
}

/** テスト用メモを作成する */
export async function createTestMemo(
  supabase: TestSupabaseClient,
  bookId: string,
  opts: { content?: string; favorite?: boolean } = {}
): Promise<TestMemo> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("未認証")

  const content = opts.content ?? "E2Eテスト用メモ"
  const favorite = opts.favorite ?? false

  const { data, error } = await supabase
    .from("reading_memos")
    .insert({
      user_id: user.id,
      book_id: bookId,
      content,
      favorite,
      page_number: null,
    })
    .select("id, content, favorite, book_id")
    .single()

  if (error) throw new Error(`メモ作成失敗: ${error.message}`)
  return data as TestMemo
}

/** テスト用書籍を削除する（存在しない場合は無視） */
export async function deleteTestBook(supabase: TestSupabaseClient, id: string): Promise<void> {
  await supabase.from("books").delete().eq("id", id)
}

/** テスト用メモを削除する（存在しない場合は無視） */
export async function deleteTestMemo(supabase: TestSupabaseClient, id: string): Promise<void> {
  await supabase.from("reading_memos").delete().eq("id", id)
}
