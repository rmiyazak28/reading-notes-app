import { test, expect } from "@playwright/test"
import { createTestDb } from "../../helpers/db"

const EMAIL = process.env.E2E_TEST_EMAIL!
const PASSWORD = process.env.E2E_TEST_PASSWORD!

// ログアウトテストでセッションが無効化された場合に再認証する
async function ensureAuthenticated(page: import("@playwright/test").Page) {
  await page.goto("/settings")
  if (!page.url().includes("/settings")) {
    await page.getByLabel("メールアドレス").fill(EMAIL)
    await page.getByLabel("パスワード").fill(PASSWORD)
    await page.getByRole("button", { name: "ログイン" }).click()
    await page.waitForURL("**/home")
    await page.goto("/settings")
  }
}

test.describe("SCR-09 設定画面", () => {
  test.describe("画面遷移・初期表示", () => {
    test.beforeEach(async ({ page }) => {
      await ensureAuthenticated(page)
    })

    test("設定画面に直接アクセスすると設定画面が表示される", async ({ page }) => {
      await expect(page).toHaveURL("/settings")
      await expect(page.getByRole("heading", { name: "ユーザー名変更" })).toBeVisible()
      await expect(page.getByRole("heading", { name: "メールアドレス変更" })).toBeVisible()
      await expect(page.getByRole("heading", { name: "パスワード変更" })).toBeVisible()
      await expect(page.getByRole("heading", { name: "ログアウト" })).toBeVisible()
      await expect(page.getByRole("heading", { name: "アカウント削除" })).toBeVisible()
    })

    test("ユーザー名フィールドが表示される", async ({ page }) => {
      await expect(page.getByLabel("ユーザー名")).toBeVisible()
    })

    test("メールアドレスフィールドに現在のメールアドレスが初期表示される", async ({ page }) => {
      await expect(page.getByLabel("メールアドレス")).not.toHaveValue("")
    })
  })

  test.describe("ユーザー名変更", () => {
    let originalName: string

    test.beforeEach(async ({ page }) => {
      await ensureAuthenticated(page)
      originalName = await page.getByLabel("ユーザー名").inputValue()
    })

    test.afterEach(async () => {
      const supabase = await createTestDb()
      await supabase.auth.updateUser({ data: { name: originalName } })
    })

    test("ユーザー名を空にして送信 → バリデーションエラーが表示される", async ({ page }) => {
      const nameSection = page.locator("section").filter({ hasText: "ユーザー名変更" })
      await nameSection.getByLabel("ユーザー名").fill("")
      await nameSection.getByRole("button", { name: "更新する" }).click()
      await expect(page.getByText("ユーザー名を入力してください")).toBeVisible()
    })

    test("有効なユーザー名を入力して送信 → 成功トーストが表示される", async ({ page }) => {
      const nameSection = page.locator("section").filter({ hasText: "ユーザー名変更" })
      await nameSection.getByLabel("ユーザー名").fill("E2E_テストユーザー")
      await nameSection.getByRole("button", { name: "更新する" }).click()
      await expect(page.getByText("ユーザー名を更新しました", { exact: true })).toBeVisible()
    })
  })

  test.describe("メールアドレス変更 (バリデーション)", () => {
    test.beforeEach(async ({ page }) => {
      await ensureAuthenticated(page)
    })

    test("メールアドレスを空にして送信 → バリデーションエラーが表示される", async ({ page }) => {
      const emailSection = page.locator("section").filter({ hasText: "メールアドレス変更" })
      // type="email" フィールドは fill("") でイベントが発火しないため、選択してBackspaceで削除する
      await emailSection.getByLabel("メールアドレス").click({ clickCount: 3 })
      await page.keyboard.press("Backspace")
      await emailSection.getByRole("button", { name: "更新する" }).click()
      await expect(page.getByText("メールアドレスを入力してください")).toBeVisible()
    })

    test("不正な形式のメールアドレスを入力して送信 → バリデーションエラーが表示される", async ({ page }) => {
      const emailSection = page.locator("section").filter({ hasText: "メールアドレス変更" })
      await emailSection.getByLabel("メールアドレス").fill("invalid-email")
      await emailSection.getByRole("button", { name: "更新する" }).click()
      await expect(page.getByText("メール形式で入力してください")).toBeVisible()
    })
  })

  test.describe("パスワード変更 (バリデーション)", () => {
    test.beforeEach(async ({ page }) => {
      await ensureAuthenticated(page)
    })

    test("パスワードを空にして送信 → バリデーションエラーが表示される", async ({ page }) => {
      const passwordSection = page.locator("section").filter({ hasText: "パスワード変更" })
      await passwordSection.getByRole("button", { name: "更新する" }).click()
      await expect(page.getByText("パスワードを入力してください", { exact: true })).toBeVisible()
    })

    test("7文字以下のパスワードを入力して送信 → バリデーションエラーが表示される", async ({ page }) => {
      const passwordSection = page.locator("section").filter({ hasText: "パスワード変更" })
      await passwordSection.getByLabel("新しいパスワード").fill("Ab1234")
      await passwordSection.getByRole("button", { name: "更新する" }).click()
      await expect(page.getByText("パスワードは8文字以上で入力してください")).toBeVisible()
    })

    test("英字を含まないパスワードを入力して送信 → バリデーションエラーが表示される", async ({ page }) => {
      const passwordSection = page.locator("section").filter({ hasText: "パスワード変更" })
      await passwordSection.getByLabel("新しいパスワード").fill("12345678")
      await passwordSection.getByRole("button", { name: "更新する" }).click()
      await expect(page.getByText("英字を1文字以上含めてください")).toBeVisible()
    })

    test("数字を含まないパスワードを入力して送信 → バリデーションエラーが表示される", async ({ page }) => {
      const passwordSection = page.locator("section").filter({ hasText: "パスワード変更" })
      await passwordSection.getByLabel("新しいパスワード").fill("abcdefgh")
      await passwordSection.getByRole("button", { name: "更新する" }).click()
      await expect(page.getByText("数字を1文字以上含めてください")).toBeVisible()
    })

    test("確認パスワードを空にして送信 → バリデーションエラーが表示される", async ({ page }) => {
      const passwordSection = page.locator("section").filter({ hasText: "パスワード変更" })
      await passwordSection.getByLabel("新しいパスワード").fill("ValidPass1")
      await passwordSection.getByRole("button", { name: "更新する" }).click()
      await expect(page.getByText("確認用パスワードを入力してください")).toBeVisible()
    })

    test("パスワードと確認パスワードが不一致で送信 → バリデーションエラーが表示される", async ({ page }) => {
      const passwordSection = page.locator("section").filter({ hasText: "パスワード変更" })
      await passwordSection.getByLabel("新しいパスワード").fill("ValidPass1")
      await passwordSection.getByLabel("パスワード確認").fill("ValidPass2")
      await passwordSection.getByRole("button", { name: "更新する" }).click()
      await expect(page.getByText("パスワードが一致しません")).toBeVisible()
    })
  })

  // ログアウトはセッションを無効化するため最後に実行する
  test.describe("アカウント削除ダイアログ", () => {
    test.beforeEach(async ({ page }) => {
      await ensureAuthenticated(page)
    })

    test("「アカウントを削除する」をクリック → 確認ダイアログが表示される", async ({ page }) => {
      await page.getByRole("button", { name: "アカウントを削除する" }).click()
      await expect(page.getByRole("alertdialog")).toBeVisible()
      await expect(page.getByText("アカウントを削除しますか？")).toBeVisible()
    })

    test("確認ダイアログで「キャンセル」をクリック → ダイアログが閉じ設定画面に留まる", async ({ page }) => {
      await page.getByRole("button", { name: "アカウントを削除する" }).click()
      await page.getByRole("button", { name: "キャンセル" }).click()
      await expect(page.getByRole("alertdialog")).not.toBeVisible()
      await expect(page).toHaveURL("/settings")
    })
  })

  test.describe("ログアウト", () => {
    test("ログアウトボタンをクリック → /login にリダイレクトされる", async ({ page }) => {
      await ensureAuthenticated(page)
      await page.getByRole("button", { name: "ログアウト" }).click()
      await expect(page).toHaveURL("/login")
    })
  })
})
