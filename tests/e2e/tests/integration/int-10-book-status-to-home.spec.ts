import { test, expect } from "@playwright/test"
import {
  createTestDb,
  createTestBook,
  deleteTestBook,
  type TestSupabaseClient,
} from "../../helpers/db"

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

test.describe("INT-10: 書籍ステータス変更（reading→completed）→ホームの読書中セクションから消える", () => {
  test.use({ viewport: { width: 1280, height: 800 }, userAgent: DESKTOP_UA, isMobile: false, hasTouch: false })
  test.setTimeout(60000)

  let db: TestSupabaseClient
  let bookId: string
  let bookTitle: string

  test.beforeEach(async () => {
    db = await createTestDb()
    const book = await createTestBook(db, { status: "reading" })
    bookId = book.id
    bookTitle = book.title
  })

  test.afterEach(async () => {
    await deleteTestBook(db, bookId)
  })

  test("MOD-02で読書状態を「読了」に変更すると /home の読書中セクションから消える", async ({ page }) => {
    // 事前確認: 読書中セクションに表示されている
    await page.goto("/home")
    const readingSection = page.locator("section").filter({ hasText: "読書中" }).first()
    await expect(readingSection.getByText(bookTitle)).toBeVisible()

    // 書籍詳細へ遷移してステータスを読了に変更
    await page.goto(`/books/${bookId}`)
    await page.getByRole("button", { name: "書籍を編集" }).click()
    await page.getByRole("combobox").click()
    await page.getByRole("option", { name: "読了" }).click()
    await page.getByLabel(/読了日/).fill("2026-06-12")
    await page.getByRole("button", { name: "更新" }).click()
    await page.getByText("書籍情報を更新しました", { exact: true }).waitFor()

    // /home に戻って読書中セクションから消えていることを確認
    await page.goto("/home")
    await expect(readingSection.getByText(bookTitle)).not.toBeVisible()
  })
})
