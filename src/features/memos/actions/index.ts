"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/types/actions"
import type { MemoWithTags, MemoWithBook, Tag } from "@/features/memos/types"

type RawMemo = Omit<MemoWithTags, "tags"> & {
  memo_tags: { tags: { id: string; name: string } | null }[]
}

type RawMemoWithBook = Omit<MemoWithBook, "tags" | "book_title" | "book_author"> & {
  memo_tags: { tags: { id: string; name: string } | null }[]
  books: { title: string; author: string | null }
}

type GetMemosParams = {
  bookId?: string
  query?: string
  favoriteOnly?: boolean
  limit?: number
  offset?: number
}

export type SearchMemosParams = {
  query?: string
  favoriteOnly?: boolean
  sortBy?: "created_at" | "updated_at"
  limit?: number
  offset?: number
}

const searchMemosSchema = z.object({
  query: z.string().optional(),
  favoriteOnly: z.boolean().optional(),
  sortBy: z.enum(["created_at", "updated_at"]).optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
})

export async function searchMemos(params: SearchMemosParams): Promise<ActionResult<MemoWithBook[]>> {
  const parsed = searchMemosSchema.safeParse(params)
  if (!parsed.success) {
    return { data: null, error: { code: "VALIDATION", message: parsed.error.issues[0].message } }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { code: "UNAUTHORIZED", message: "認証が必要です" } }

  const { query, favoriteOnly, sortBy = "created_at", limit = 50, offset = 0 } = parsed.data

  let builder = supabase
    .from("reading_memos")
    .select(`
      *,
      memo_tags (
        tags (id, name)
      ),
      books (title, author)
    `)
    .order(sortBy, { ascending: false })

  if (favoriteOnly) {
    builder = builder.eq("favorite", true)
  }

  // PostgREST の or() は結合テーブルのカラムを直接指定できないため、横断検索はクライアント側で行う。
  // query がある場合は上限1000件で取得してからクライアントフィルタで絞る。
  // query がない場合はページネーション用に range を適用する。
  const SEARCH_MAX = 1000
  const { data, error } = query && query.trim()
    ? await builder.range(0, SEARCH_MAX - 1)
    : await builder.range(offset, offset + limit - 1)

  if (error) return { data: null, error: { code: "DB_ERROR", message: "処理に失敗しました" } }

  const memos: MemoWithBook[] = (data as unknown as RawMemoWithBook[]).map(
    ({ memo_tags, books, ...rest }) => ({
      ...rest,
      book_title: books?.title ?? "",
      book_author: books?.author ?? null,
      tags: memo_tags
        .filter((mt): mt is { tags: Tag } => mt.tags !== null)
        .map(mt => mt.tags),
    })
  )

  // タグ名での絞り込みはDB側ORでは難しいため、クエリがある場合はクライアント側で補完フィルタする
  if (query && query.trim()) {
    const q = query.trim().toLowerCase()
    return {
      data: memos.filter(m =>
        m.content.toLowerCase().includes(q) ||
        m.book_title.toLowerCase().includes(q) ||
        (m.book_author?.toLowerCase().includes(q) ?? false) ||
        m.tags.some(t => t.name.toLowerCase().includes(q))
      ),
      error: null,
    }
  }

  return { data: memos, error: null }
}

export async function getMemos(params: GetMemosParams): Promise<ActionResult<MemoWithTags[]>> {
  if (params.bookId !== undefined && !z.string().uuid().safeParse(params.bookId).success) {
    return { data: null, error: { code: "VALIDATION", message: "bookId が不正です" } }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { code: "UNAUTHORIZED", message: "認証が必要です" } }

  const { data, error } = await supabase
    .from("reading_memos")
    .select(`
      *,
      memo_tags (
        tags (id, name)
      )
    `)
    .eq("book_id", params.bookId)
    .order("created_at", { ascending: false })

  if (error) return { data: null, error: { code: "DB_ERROR", message: "処理に失敗しました" } }

  const memos: MemoWithTags[] = (data as unknown as RawMemo[]).map(({ memo_tags, ...rest }) => ({
    ...rest,
    tags: memo_tags
      .filter((mt): mt is { tags: Tag } => mt.tags !== null)
      .map(mt => mt.tags),
  }))

  return { data: memos, error: null }
}

/**
 * ★ボタンから呼び出す。現在値を取得してから反転するため2クエリになるが、
 * Supabase の update では NOT 演算子を直接記述できないため、この方式を採用している。
 */
export async function toggleFavorite(id: string): Promise<ActionResult<{ favorite: boolean }>> {
  if (!z.string().uuid().safeParse(id).success) {
    return { data: null, error: { code: "VALIDATION", message: "id が不正です" } }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { code: "UNAUTHORIZED", message: "認証が必要です" } }

  const { data: current, error: fetchError } = await supabase
    .from("reading_memos")
    .select("favorite")
    .eq("id", id)
    .single()

  if (fetchError) return { data: null, error: { code: "NOT_FOUND", message: "メモが見つかりません" } }

  const { data, error } = await supabase
    .from("reading_memos")
    .update({ favorite: !current.favorite })
    .eq("id", id)
    .select("favorite")
    .single()

  if (error) return { data: null, error: { code: "DB_ERROR", message: "処理に失敗しました" } }

  return { data: { favorite: data.favorite }, error: null }
}

export async function deleteMemo(id: string): Promise<ActionResult<void>> {
  if (!z.string().uuid().safeParse(id).success) {
    return { data: null, error: { code: "VALIDATION", message: "id が不正です" } }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { code: "UNAUTHORIZED", message: "認証が必要です" } }

  const { error } = await supabase
    .from("reading_memos")
    .delete()
    .eq("id", id)

  if (error) return { data: null, error: { code: "DB_ERROR", message: "処理に失敗しました" } }

  revalidatePath("/memos")
  return { data: undefined, error: null }
}

export async function getTags(): Promise<ActionResult<Tag[]>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { code: "UNAUTHORIZED", message: "認証が必要です" } }

  const { data, error } = await supabase
    .from("tags")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name")

  if (error) return { data: null, error: { code: "DB_ERROR", message: "処理に失敗しました" } }

  return { data: data as Tag[], error: null }
}

export async function getMemo(id: string): Promise<ActionResult<MemoWithTags>> {
  if (!z.string().uuid().safeParse(id).success) {
    return { data: null, error: { code: "VALIDATION", message: "id が不正です" } }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { code: "UNAUTHORIZED", message: "認証が必要です" } }

  const { data, error } = await supabase
    .from("reading_memos")
    .select(`
      *,
      memo_tags (
        tags (id, name)
      )
    `)
    .eq("id", id)
    .single()

  if (error) return { data: null, error: { code: "NOT_FOUND", message: "メモが見つかりません" } }

  const { memo_tags, ...rest } = data as unknown as RawMemo
  return {
    data: {
      ...rest,
      tags: memo_tags
        .filter((mt): mt is { tags: Tag } => mt.tags !== null)
        .map(mt => mt.tags),
    },
    error: null,
  }
}

const updateMemoSchema = z.object({
  page_number: z.number().int().min(1).nullable().optional(),
  content: z.string().min(1, "メモ内容は必須です").max(5000, "5000文字以内で入力してください"),
  tags: z.array(
    z.object({
      id: z.uuid().optional(),
      name: z.string().min(1).max(50),
    })
  ).optional(),
  favorite: z.boolean(),
})

type UpdateMemoInput = {
  page_number?: number | null
  content?: string
  tags?: { id?: string; name: string }[]
  favorite?: boolean
}

export async function updateMemo(id: string, input: UpdateMemoInput): Promise<ActionResult<MemoWithTags>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { code: "UNAUTHORIZED", message: "認証が必要です" } }

  const parsed = updateMemoSchema.safeParse(input)
  if (!parsed.success) {
    return { data: null, error: { code: "VALIDATION", message: parsed.error.issues[0].message } }
  }

  const { data: memo, error: memoError } = await supabase
    .from("reading_memos")
    .update({
      page_number: parsed.data.page_number,
      content: parsed.data.content,
      favorite: parsed.data.favorite,
    })
    .eq("id", id)
    .select()
    .single()

  if (memoError) return { data: null, error: { code: "DB_ERROR", message: "処理に失敗しました" } }

  const tags = parsed.data.tags ?? []
  const resolvedTagIds: string[] = []

  for (const tag of tags) {
    if (tag.id) {
      resolvedTagIds.push(tag.id)
    } else {
      const { data: upserted, error: upsertError } = await supabase
        .from("tags")
        .upsert(
          { user_id: user.id, name: tag.name },
          { onConflict: "user_id,name", ignoreDuplicates: false }
        )
        .select("id, name")
        .single()

      if (upsertError) return { data: null, error: { code: "DB_ERROR", message: "処理に失敗しました" } }
      resolvedTagIds.push(upserted.id)
    }
  }

  // 洗い替え：既存 memo_tags を削除して再 INSERT
  const { error: deleteError } = await supabase
    .from("memo_tags")
    .delete()
    .eq("memo_id", id)

  if (deleteError) return { data: null, error: { code: "DB_ERROR", message: "処理に失敗しました" } }

  if (resolvedTagIds.length > 0) {
    const { error: tagError } = await supabase
      .from("memo_tags")
      .insert(resolvedTagIds.map(tag_id => ({ memo_id: id, tag_id })))

    if (tagError) return { data: null, error: { code: "DB_ERROR", message: "処理に失敗しました" } }
  }

  const { data: resolvedTags, error: tagsError } = resolvedTagIds.length > 0
    ? await supabase.from("tags").select("id, name").in("id", resolvedTagIds)
    : { data: [], error: null }

  if (tagsError) return { data: null, error: { code: "DB_ERROR", message: "処理に失敗しました" } }

  revalidatePath("/memos")
  return {
    data: { ...memo, tags: (resolvedTags ?? []) as Tag[] },
    error: null,
  }
}

const createMemoSchema = z.object({
  book_id: z.uuid(),
  page_number: z.number().int().min(1).nullable(),
  content: z.string().min(1, "メモ内容は必須です").max(5000, "5000文字以内で入力してください"),
  tags: z.array(
    z.object({
      id: z.uuid().optional(),
      name: z.string().min(1).max(50),
    })
  ).optional(),
  favorite: z.boolean(),
})

type CreateMemoInput = {
  book_id: string
  page_number: number | null
  content: string
  tags?: { id?: string; name: string }[]
  favorite: boolean
}

export async function createMemo(input: CreateMemoInput): Promise<ActionResult<MemoWithTags>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { code: "UNAUTHORIZED", message: "認証が必要です" } }

  const parsed = createMemoSchema.safeParse(input)
  if (!parsed.success) {
    return { data: null, error: { code: "VALIDATION", message: parsed.error.issues[0].message } }
  }

  const { data: memo, error: memoError } = await supabase
    .from("reading_memos")
    .insert({
      user_id: user.id,
      book_id: parsed.data.book_id,
      page_number: parsed.data.page_number,
      content: parsed.data.content,
      favorite: parsed.data.favorite,
    })
    .select()
    .single()

  if (memoError) return { data: null, error: { code: "DB_ERROR", message: "処理に失敗しました" } }

  const tags = parsed.data.tags ?? []
  const resolvedTagIds: string[] = []

  for (const tag of tags) {
    if (tag.id) {
      resolvedTagIds.push(tag.id)
    } else {
      // 新規タグ：同名が既存なら既存idを返す、なければINSERT
      const { data: upserted, error: upsertError } = await supabase
        .from("tags")
        .upsert(
          { user_id: user.id, name: tag.name },
          { onConflict: "user_id,name", ignoreDuplicates: false }
        )
        .select("id, name")
        .single()

      if (upsertError) return { data: null, error: { code: "DB_ERROR", message: "処理に失敗しました" } }
      resolvedTagIds.push(upserted.id)
    }
  }

  if (resolvedTagIds.length > 0) {
    const { error: tagError } = await supabase
      .from("memo_tags")
      .insert(resolvedTagIds.map(tag_id => ({ memo_id: memo.id, tag_id })))

    if (tagError) return { data: null, error: { code: "DB_ERROR", message: "処理に失敗しました" } }
  }

  const { data: resolvedTags, error: tagsError } = resolvedTagIds.length > 0
    ? await supabase.from("tags").select("id, name").in("id", resolvedTagIds)
    : { data: [], error: null }

  if (tagsError) return { data: null, error: { code: "DB_ERROR", message: "処理に失敗しました" } }

  return {
    data: { ...memo, tags: (resolvedTags ?? []) as Tag[] },
    error: null,
  }
}
