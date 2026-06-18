import { describe, it, expect, vi, beforeEach } from "vitest"
import { getBook } from "@/features/books/actions"

// getBook は 2 本のクエリを発行する:
//   1. books.select().eq().single()          → mockBooksSingle
//   2. reading_memos.select().eq().eq()      → mockStarQuery（最後の eq が Promise を返す）
const { mockBooksSingle, mockStarQuery } = vi.hoisted(() => {
  const mockBooksSingle = vi.fn()
  const mockStarQuery = vi.fn()

  return { mockBooksSingle, mockStarQuery }
})

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
    },
    from: vi.fn((table: string) => {
      if (table === "books") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockBooksSingle,
            })),
          })),
        }
      }
      // reading_memos: .select().eq("book_id").eq("favorite")
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: mockStarQuery,
          })),
        })),
      }
    }),
  }),
}))

const dbBook = {
  id: "00000000-0000-0000-0000-000000000001",
  user_id: "user-1",
  title: "テスト書籍",
  author: "著者名",
  genre: "IT",
  status: "reading",
  completed_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-05-31T00:00:00Z",
  memoCount: [{ count: 5 }],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("getBook", () => {
  describe("認証エラー", () => {
    it("未認証の場合 UNAUTHORIZED を返す", async () => {
      const { createClient } = await import("@/lib/supabase/server")
      vi.mocked(createClient).mockResolvedValueOnce({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
        from: vi.fn(),
      } as never)

      const result = await getBook("00000000-0000-0000-0000-000000000001")

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("UNAUTHORIZED")
    })
  })

  describe("NOT_FOUND ハンドリング", () => {
    it("PGRST116（0行）の場合 NOT_FOUND を返す", async () => {
      mockBooksSingle.mockResolvedValue({ data: null, error: { code: "PGRST116", message: "not found" } })

      const result = await getBook("00000000-0000-0000-0000-000000000001")

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("NOT_FOUND")
    })

    it("その他の DB エラーの場合 DB_ERROR を返す", async () => {
      mockBooksSingle.mockResolvedValue({ data: null, error: { code: "42P01", message: "table error" } })

      const result = await getBook("00000000-0000-0000-0000-000000000001")

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("DB_ERROR")
    })
  })

  describe("正常系", () => {
    it("memoCount が配列から数値に変換される", async () => {
      mockBooksSingle.mockResolvedValue({ data: dbBook, error: null })
      mockStarQuery.mockResolvedValue({ data: [], error: null })

      const result = await getBook("00000000-0000-0000-0000-000000000001")

      expect(result.error).toBeNull()
      expect(result.data?.memoCount).toBe(5)
    })

    it("starCount は favorite=true のメモ数になる", async () => {
      mockBooksSingle.mockResolvedValue({ data: dbBook, error: null })
      mockStarQuery.mockResolvedValue({
        data: [{ id: "m1" }, { id: "m2" }, { id: "m3" }],
        error: null,
      })

      const result = await getBook("00000000-0000-0000-0000-000000000001")

      expect(result.data?.starCount).toBe(3)
    })

    it("favorite メモが 0 件の場合 starCount が 0 になる", async () => {
      mockBooksSingle.mockResolvedValue({ data: dbBook, error: null })
      mockStarQuery.mockResolvedValue({ data: [], error: null })

      const result = await getBook("00000000-0000-0000-0000-000000000001")

      expect(result.data?.starCount).toBe(0)
    })

    it("書籍の基本情報が返される", async () => {
      mockBooksSingle.mockResolvedValue({ data: dbBook, error: null })
      mockStarQuery.mockResolvedValue({ data: [], error: null })

      const result = await getBook("00000000-0000-0000-0000-000000000001")

      expect(result.data?.title).toBe("テスト書籍")
      expect(result.data?.author).toBe("著者名")
      expect(result.data?.status).toBe("reading")
    })
  })
})
