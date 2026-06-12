import { describe, it, expect, vi, beforeEach } from "vitest"
import { createMemo } from "@/features/memos/actions"

const BOOK_ID = "11111111-1111-4111-8111-111111111111"
const TAG_ID = "22222222-2222-4222-8222-222222222222"
const MEMO_ID = "33333333-3333-4333-8333-333333333333"

const mockMemoRow = {
  id: MEMO_ID,
  user_id: "user-1",
  book_id: BOOK_ID,
  page_number: 42,
  content: "テストメモ",
  favorite: false,
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
}

// Supabase のチェーン呼び出しは from() で返すオブジェクトを使い回す
const { mockGetUser, mockInsertMemo, mockInsertTags, mockSelectTags } = vi.hoisted(() => {
  const mockInsertMemo = vi.fn()
  const mockInsertTags = vi.fn()
  const mockSelectTags = vi.fn()
  const mockGetUser = vi.fn()
  return { mockGetUser, mockInsertMemo, mockInsertTags, mockSelectTags }
})

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: vi.fn((table: string) => {
      if (table === "reading_memos") {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: mockInsertMemo,
            })),
          })),
        }
      }
      if (table === "memo_tags") {
        return { insert: mockInsertTags }
      }
      if (table === "tags") {
        return {
          upsert: vi.fn(() => ({
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
          select: vi.fn(() => ({
            in: mockSelectTags,
          })),
        }
      }
      return {}
    }),
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe("createMemo", () => {
  describe("認証エラー", () => {
    it("未認証の場合 UNAUTHORIZED を返す", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const result = await createMemo({
        book_id: BOOK_ID,
        page_number: null,
        content: "メモ",
        favorite: false,
      })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("UNAUTHORIZED")
    })
  })

  describe("バリデーション", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
    })

    it("content が空の場合 VALIDATION エラーを返す", async () => {
      const result = await createMemo({
        book_id: BOOK_ID,
        page_number: null,
        content: "",
        favorite: false,
      })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("VALIDATION")
      expect(result.error?.message).toBe("メモ内容は必須です")
    })

    it("content が 5001 文字の場合 VALIDATION エラーを返す", async () => {
      const result = await createMemo({
        book_id: BOOK_ID,
        page_number: null,
        content: "a".repeat(5001),
        favorite: false,
      })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("VALIDATION")
      expect(result.error?.message).toBe("5000文字以内で入力してください")
    })

    it("book_id が UUID 形式でない場合 VALIDATION エラーを返す", async () => {
      const result = await createMemo({
        book_id: "not-a-uuid",
        page_number: null,
        content: "メモ内容",
        favorite: false,
      })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("VALIDATION")
    })

    it("page_number が 0 の場合 VALIDATION エラーを返す", async () => {
      const result = await createMemo({
        book_id: BOOK_ID,
        page_number: 0,
        content: "メモ内容",
        favorite: false,
      })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("VALIDATION")
    })
  })

  describe("正常系", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
    })

    it("タグなしでメモを登録できる", async () => {
      mockInsertMemo.mockResolvedValue({ data: mockMemoRow, error: null })
      mockSelectTags.mockResolvedValue({ data: [], error: null })

      const result = await createMemo({
        book_id: BOOK_ID,
        page_number: 42,
        content: "テストメモ",
        favorite: false,
      })

      expect(result.error).toBeNull()
      expect(result.data?.id).toBe(MEMO_ID)
      expect(result.data?.tags).toEqual([])
      // memo_tags への insert は呼ばれない
      expect(mockInsertTags).not.toHaveBeenCalled()
    })

    it("タグありでメモを登録し、memo_tags に insert される", async () => {
      mockInsertMemo.mockResolvedValue({ data: mockMemoRow, error: null })
      mockInsertTags.mockResolvedValue({ error: null })
      mockSelectTags.mockResolvedValue({
        data: [{ id: TAG_ID, name: "DDD" }],
        error: null,
      })

      const result = await createMemo({
        book_id: BOOK_ID,
        page_number: null,
        content: "テストメモ",
        tags: [{ id: TAG_ID, name: "DDD" }],
        favorite: false,
      })

      expect(result.error).toBeNull()
      expect(result.data?.tags).toEqual([{ id: TAG_ID, name: "DDD" }])
      expect(mockInsertTags).toHaveBeenCalledWith([{ memo_id: MEMO_ID, tag_id: TAG_ID }])
    })

    it("お気に入り true で登録できる", async () => {
      const favoriteRow = { ...mockMemoRow, favorite: true }
      mockInsertMemo.mockResolvedValue({ data: favoriteRow, error: null })
      mockSelectTags.mockResolvedValue({ data: [], error: null })

      const result = await createMemo({
        book_id: BOOK_ID,
        page_number: null,
        content: "お気に入りメモ",
        favorite: true,
      })

      expect(result.error).toBeNull()
      expect(result.data?.favorite).toBe(true)
    })

    it("page_number が null でも登録できる", async () => {
      mockInsertMemo.mockResolvedValue({ data: { ...mockMemoRow, page_number: null }, error: null })
      mockSelectTags.mockResolvedValue({ data: [], error: null })

      const result = await createMemo({
        book_id: BOOK_ID,
        page_number: null,
        content: "ページなしメモ",
        favorite: false,
      })

      expect(result.error).toBeNull()
      expect(result.data?.page_number).toBeNull()
    })
  })

  describe("DB エラー", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
    })

    it("reading_memos の insert 失敗で DB_ERROR を返す", async () => {
      mockInsertMemo.mockResolvedValue({ data: null, error: { message: "db error" } })

      const result = await createMemo({
        book_id: BOOK_ID,
        page_number: null,
        content: "メモ",
        favorite: false,
      })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("DB_ERROR")
    })

    it("memo_tags の insert 失敗で DB_ERROR を返す", async () => {
      mockInsertMemo.mockResolvedValue({ data: mockMemoRow, error: null })
      mockInsertTags.mockResolvedValue({ error: { message: "tag insert error" } })

      const result = await createMemo({
        book_id: BOOK_ID,
        page_number: null,
        content: "メモ",
        tags: [{ id: TAG_ID, name: "DDD" }],
        favorite: false,
      })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("DB_ERROR")
    })
  })
})
