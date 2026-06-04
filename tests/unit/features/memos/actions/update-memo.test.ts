import { describe, it, expect, vi, beforeEach } from "vitest"
import { updateMemo } from "@/features/memos/actions"

const MEMO_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const TAG_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const TAG_ID2 = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"

const mockMemoRow = {
  id: MEMO_ID,
  user_id: "user-1",
  book_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  page_number: 10,
  content: "更新メモ",
  favorite: false,
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-02T00:00:00Z",
}

const {
  mockGetUser,
  mockUpdateMemo,
  mockUpsertTag,
  mockDeleteMemoTags,
  mockInsertMemoTags,
  mockSelectTags,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockUpdateMemo: vi.fn(),
  mockUpsertTag: vi.fn(),
  mockDeleteMemoTags: vi.fn(),
  mockInsertMemoTags: vi.fn(),
  mockSelectTags: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: vi.fn((table: string) => {
      if (table === "reading_memos") {
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: mockUpdateMemo,
              })),
            })),
          })),
        }
      }
      if (table === "tags") {
        return {
          upsert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: mockUpsertTag,
            })),
          })),
          select: vi.fn(() => ({
            in: mockSelectTags,
          })),
        }
      }
      if (table === "memo_tags") {
        return {
          delete: vi.fn(() => ({ eq: mockDeleteMemoTags })),
          insert: mockInsertMemoTags,
        }
      }
      return {}
    }),
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe("updateMemo", () => {
  describe("認証エラー", () => {
    it("未認証の場合 UNAUTHORIZED を返す", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const result = await updateMemo(MEMO_ID, { content: "更新", favorite: false })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("UNAUTHORIZED")
    })
  })

  describe("バリデーション", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
    })

    it("content が空の場合 VALIDATION エラーを返す", async () => {
      const result = await updateMemo(MEMO_ID, { content: "", favorite: false })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("VALIDATION")
      expect(result.error?.message).toBe("メモ内容は必須です")
    })

    it("content が 5001 文字の場合 VALIDATION エラーを返す", async () => {
      const result = await updateMemo(MEMO_ID, { content: "a".repeat(5001), favorite: false })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("VALIDATION")
      expect(result.error?.message).toBe("5000文字以内で入力してください")
    })

    it("page_number が 0 の場合 VALIDATION エラーを返す", async () => {
      const result = await updateMemo(MEMO_ID, { page_number: 0, content: "メモ", favorite: false })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("VALIDATION")
    })
  })

  describe("正常系", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
      mockUpdateMemo.mockResolvedValue({ data: mockMemoRow, error: null })
      mockDeleteMemoTags.mockResolvedValue({ error: null })
      mockSelectTags.mockResolvedValue({ data: [], error: null })
    })

    it("タグなしで更新できる", async () => {
      const result = await updateMemo(MEMO_ID, {
        page_number: 10,
        content: "更新メモ",
        tags: [],
        favorite: false,
      })

      expect(result.error).toBeNull()
      expect(result.data?.content).toBe("更新メモ")
      expect(result.data?.tags).toEqual([])
      expect(mockInsertMemoTags).not.toHaveBeenCalled()
    })

    it("既存タグIDで更新すると memo_tags が洗い替えされる", async () => {
      mockInsertMemoTags.mockResolvedValue({ error: null })
      mockSelectTags.mockResolvedValue({ data: [{ id: TAG_ID, name: "設計" }], error: null })

      const result = await updateMemo(MEMO_ID, {
        content: "更新メモ",
        tags: [{ id: TAG_ID, name: "設計" }],
        favorite: false,
      })

      expect(result.error).toBeNull()
      expect(mockDeleteMemoTags).toHaveBeenCalled()
      expect(mockInsertMemoTags).toHaveBeenCalledWith([{ memo_id: MEMO_ID, tag_id: TAG_ID }])
      expect(result.data?.tags).toEqual([{ id: TAG_ID, name: "設計" }])
    })

    it("新規タグ名（idなし）はupsertされる", async () => {
      mockUpsertTag.mockResolvedValue({ data: { id: TAG_ID2, name: "新タグ" }, error: null })
      mockInsertMemoTags.mockResolvedValue({ error: null })
      mockSelectTags.mockResolvedValue({ data: [{ id: TAG_ID2, name: "新タグ" }], error: null })

      const result = await updateMemo(MEMO_ID, {
        content: "更新メモ",
        tags: [{ name: "新タグ" }],
        favorite: false,
      })

      expect(result.error).toBeNull()
      expect(mockUpsertTag).toHaveBeenCalled()
      expect(result.data?.tags).toEqual([{ id: TAG_ID2, name: "新タグ" }])
    })

    it("page_number が null で更新できる", async () => {
      mockUpdateMemo.mockResolvedValue({ data: { ...mockMemoRow, page_number: null }, error: null })

      const result = await updateMemo(MEMO_ID, {
        page_number: null,
        content: "ページなし",
        tags: [],
        favorite: false,
      })

      expect(result.error).toBeNull()
      expect(result.data?.page_number).toBeNull()
    })

    it("favorite を true に更新できる", async () => {
      mockUpdateMemo.mockResolvedValue({ data: { ...mockMemoRow, favorite: true }, error: null })

      const result = await updateMemo(MEMO_ID, {
        content: "お気に入りメモ",
        tags: [],
        favorite: true,
      })

      expect(result.error).toBeNull()
      expect(result.data?.favorite).toBe(true)
    })
  })

  describe("DB エラー", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
    })

    it("reading_memos の update 失敗で DB_ERROR を返す", async () => {
      mockUpdateMemo.mockResolvedValue({ data: null, error: { message: "db error" } })

      const result = await updateMemo(MEMO_ID, { content: "メモ", favorite: false })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("DB_ERROR")
    })

    it("memo_tags の delete 失敗で DB_ERROR を返す", async () => {
      mockUpdateMemo.mockResolvedValue({ data: mockMemoRow, error: null })
      mockDeleteMemoTags.mockResolvedValue({ error: { message: "delete error" } })

      const result = await updateMemo(MEMO_ID, {
        content: "メモ",
        tags: [],
        favorite: false,
      })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("DB_ERROR")
    })
  })
})
