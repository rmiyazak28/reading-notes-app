import { describe, it, expect, vi, beforeEach } from "vitest"
import { toggleFavorite } from "@/features/memos/actions"

const MEMO_ID = "00000000-0000-4000-8000-000000000001"
const USER_ID = "00000000-0000-4000-8000-000000000002"

const { mockFetchSingle, mockUpdateSingle, mockGetUser } = vi.hoisted(() => {
  const mockFetchSingle = vi.fn()
  const mockUpdateSingle = vi.fn()

  // SELECT クエリチェーン: .select().eq().single()
  const mockFetchEq = vi.fn(() => ({ single: mockFetchSingle }))
  const mockFetchSelect = vi.fn(() => ({ eq: mockFetchEq }))

  // UPDATE クエリチェーン: .update().eq().select().single()
  const mockUpdateSelectEq = vi.fn(() => ({ single: mockUpdateSingle }))
  const mockUpdateEqReturn = vi.fn(() => ({ select: vi.fn(() => ({ single: mockUpdateSingle })) }))
  const mockUpdate = vi.fn(() => ({ eq: mockUpdateEqReturn }))

  const mockFrom = vi.fn(() => ({
    select: mockFetchSelect,
    update: mockUpdate,
  }))

  const mockGetUser = vi.fn()
  return { mockFetchSingle, mockUpdateSingle, mockUpdateSelectEq, mockGetUser }
})

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => {
      let callCount = 0
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: mockFetchSingle,
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: mockUpdateSingle,
            })),
          })),
        })),
      }
    }),
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe("toggleFavorite", () => {
  describe("認証エラー", () => {
    it("未認証の場合 UNAUTHORIZED を返す", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const result = await toggleFavorite(MEMO_ID)

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("UNAUTHORIZED")
    })
  })

  describe("フェッチエラー", () => {
    it("メモが見つからない場合 NOT_FOUND を返す", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })
      mockFetchSingle.mockResolvedValue({ data: null, error: { code: "PGRST116" } })

      const result = await toggleFavorite(MEMO_ID)

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("NOT_FOUND")
    })
  })

  describe("正常系", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })
    })

    it("false → true に切り替わる", async () => {
      mockFetchSingle.mockResolvedValue({ data: { favorite: false }, error: null })
      mockUpdateSingle.mockResolvedValue({ data: { favorite: true }, error: null })

      const result = await toggleFavorite(MEMO_ID)

      expect(result.error).toBeNull()
      expect(result.data?.favorite).toBe(true)
    })

    it("true → false に切り替わる", async () => {
      mockFetchSingle.mockResolvedValue({ data: { favorite: true }, error: null })
      mockUpdateSingle.mockResolvedValue({ data: { favorite: false }, error: null })

      const result = await toggleFavorite(MEMO_ID)

      expect(result.error).toBeNull()
      expect(result.data?.favorite).toBe(false)
    })
  })

  describe("更新エラー", () => {
    it("UPDATE 失敗時 DB_ERROR を返す", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } })
      mockFetchSingle.mockResolvedValue({ data: { favorite: false }, error: null })
      mockUpdateSingle.mockResolvedValue({ data: null, error: { message: "update failed" } })

      const result = await toggleFavorite(MEMO_ID)

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("DB_ERROR")
    })
  })
})
