import { describe, it, expect, vi, beforeEach } from "vitest"
import { updateProfile, deleteAccount } from "@/features/auth/actions"

const USER_ID = "user-uuid-0001"

// ── モック ────────────────────────────────────────────────────────────────────

const { mockGetUser, mockUpdateUser, mockRefreshSession, mockAdminDeleteUser, mockSignOut } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockUpdateUser: vi.fn(),
  mockRefreshSession: vi.fn(),
  mockAdminDeleteUser: vi.fn(),
  mockSignOut: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: mockGetUser,
      updateUser: mockUpdateUser,
      refreshSession: mockRefreshSession,
      signOut: mockSignOut,
    },
  }),
}))

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn().mockReturnValue({
    auth: {
      admin: { deleteUser: mockAdminDeleteUser },
    },
  }),
}))

// ── テスト ────────────────────────────────────────────────────────────────────

describe("updateProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
    mockUpdateUser.mockResolvedValue({ error: null })
  })

  describe("正常系", () => {
    it("ユーザー名を更新できる", async () => {
      const result = await updateProfile({ name: "新しい名前" })
      expect(result.error).toBeNull()
      expect(mockUpdateUser).toHaveBeenCalledWith({ data: { name: "新しい名前" } })
    })

    it("メールアドレスを更新できる", async () => {
      const result = await updateProfile({ email: "new@example.com" })
      expect(result.error).toBeNull()
      expect(mockUpdateUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: "new@example.com" })
      )
    })

    it("パスワードを更新できる", async () => {
      const result = await updateProfile({ password: "newpass1", passwordConfirm: "newpass1" })
      expect(result.error).toBeNull()
      expect(mockUpdateUser).toHaveBeenCalledWith(
        expect.objectContaining({ password: "newpass1" })
      )
    })
  })

  describe("バリデーションエラー", () => {
    it("メールアドレス形式が不正の場合エラーを返す", async () => {
      const result = await updateProfile({ email: "not-an-email" })
      expect(result.error?.code).toBe("VALIDATION")
      expect(mockUpdateUser).not.toHaveBeenCalled()
    })

    it("パスワードと確認が一致しない場合エラーを返す", async () => {
      const result = await updateProfile({ password: "pass1234", passwordConfirm: "different" })
      expect(result.error?.code).toBe("VALIDATION")
      expect(result.error?.message).toContain("一致しません")
      expect(mockUpdateUser).not.toHaveBeenCalled()
    })
  })

  describe("認証エラー", () => {
    it("未ログインの場合 UNAUTHORIZED を返す", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
      const result = await updateProfile({ name: "名前" })
      expect(result.error?.code).toBe("UNAUTHORIZED")
    })
  })

  describe("DBエラー", () => {
    it("updateUser が失敗した場合 DB_ERROR を返す", async () => {
      mockUpdateUser.mockResolvedValue({ error: { message: "update failed" } })
      const result = await updateProfile({ name: "名前" })
      expect(result.error?.code).toBe("DB_ERROR")
    })
  })
})

describe("deleteAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
    mockAdminDeleteUser.mockResolvedValue({ error: null })
    mockSignOut.mockResolvedValue({ error: null })
    // 環境変数
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
  })

  describe("正常系", () => {
    it("アカウントを削除できる", async () => {
      const result = await deleteAccount()
      expect(result.error).toBeNull()
      expect(mockAdminDeleteUser).toHaveBeenCalledWith(USER_ID)
      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  describe("認証エラー", () => {
    it("未ログインの場合 UNAUTHORIZED を返す", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
      const result = await deleteAccount()
      expect(result.error?.code).toBe("UNAUTHORIZED")
      expect(mockAdminDeleteUser).not.toHaveBeenCalled()
    })
  })

  describe("DBエラー", () => {
    it("deleteUser が失敗した場合 DB_ERROR を返す", async () => {
      mockAdminDeleteUser.mockResolvedValue({ error: { message: "delete failed" } })
      const result = await deleteAccount()
      expect(result.error?.code).toBe("DB_ERROR")
      expect(mockSignOut).not.toHaveBeenCalled()
    })
  })
})
