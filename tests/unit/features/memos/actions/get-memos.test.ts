import { describe, it, expect, vi, beforeEach } from "vitest"
import { getMemos } from "@/features/memos/actions"

const BOOK_ID = "00000000-0000-4000-8000-000000000003"

const { mockOrder, mockGetUser } = vi.hoisted(() => {
  const mockOrder = vi.fn()
  const mockGetUser = vi.fn()
  return { mockOrder, mockGetUser }
})

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: mockOrder,
        })),
      })),
    })),
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe("getMemos", () => {
  describe("認証エラー", () => {
    it("未認証の場合 UNAUTHORIZED を返す", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const result = await getMemos({ bookId: BOOK_ID })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("UNAUTHORIZED")
    })
  })

  describe("データ変換", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
    })

    it("memo_tags ネスト構造が tags 配列にフラット化される", async () => {
      mockOrder.mockResolvedValue({
        data: [
          {
            id: "memo-1",
            user_id: "user-1",
            book_id: BOOK_ID,
            page_number: 42,
            content: "テストメモ",
            favorite: false,
            created_at: "2026-05-01T00:00:00Z",
            updated_at: "2026-05-01T00:00:00Z",
            memo_tags: [
              { tags: { id: "tag-1", name: "DDD" } },
              { tags: { id: "tag-2", name: "設計" } },
            ],
          },
        ],
        error: null,
      })

      const result = await getMemos({ bookId: BOOK_ID })

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(1)
      expect(result.data![0].tags).toEqual([
        { id: "tag-1", name: "DDD" },
        { id: "tag-2", name: "設計" },
      ])
    })

    it("memo_tags が空の場合 tags が空配列になる", async () => {
      mockOrder.mockResolvedValue({
        data: [
          {
            id: "memo-1",
            user_id: "user-1",
            book_id: BOOK_ID,
            page_number: null,
            content: "タグなしメモ",
            favorite: true,
            created_at: "2026-05-01T00:00:00Z",
            updated_at: "2026-05-01T00:00:00Z",
            memo_tags: [],
          },
        ],
        error: null,
      })

      const result = await getMemos({ bookId: BOOK_ID })

      expect(result.data![0].tags).toEqual([])
    })

    it("memo_tags に tags が null のエントリがある場合はスキップされる", async () => {
      mockOrder.mockResolvedValue({
        data: [
          {
            id: "memo-1",
            user_id: "user-1",
            book_id: BOOK_ID,
            page_number: null,
            content: "メモ",
            favorite: false,
            created_at: "2026-05-01T00:00:00Z",
            updated_at: "2026-05-01T00:00:00Z",
            memo_tags: [
              { tags: { id: "tag-1", name: "有効タグ" } },
              { tags: null },
            ],
          },
        ],
        error: null,
      })

      const result = await getMemos({ bookId: BOOK_ID })

      expect(result.data![0].tags).toHaveLength(1)
      expect(result.data![0].tags[0].name).toBe("有効タグ")
    })

    it("メモが 0 件の場合は空配列を返す", async () => {
      mockOrder.mockResolvedValue({ data: [], error: null })

      const result = await getMemos({ bookId: BOOK_ID })

      expect(result.error).toBeNull()
      expect(result.data).toEqual([])
    })

    it("変換後のメモに memo_tags フィールドが含まれない", async () => {
      mockOrder.mockResolvedValue({
        data: [
          {
            id: "memo-1",
            user_id: "user-1",
            book_id: BOOK_ID,
            page_number: null,
            content: "メモ",
            favorite: false,
            created_at: "2026-05-01T00:00:00Z",
            updated_at: "2026-05-01T00:00:00Z",
            memo_tags: [{ tags: { id: "tag-1", name: "テスト" } }],
          },
        ],
        error: null,
      })

      const result = await getMemos({ bookId: BOOK_ID })

      expect(result.data![0]).not.toHaveProperty("memo_tags")
    })
  })

  describe("DB エラー", () => {
    it("DB エラーの場合 DB_ERROR を返す", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
      mockOrder.mockResolvedValue({ data: null, error: { message: "db error" } })

      const result = await getMemos({ bookId: BOOK_ID })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("DB_ERROR")
    })
  })
})
