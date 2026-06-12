import { test, expect } from "@playwright/test"
import {
  createTestDb,
  createTestBook,
  deleteTestBook,
  type TestSupabaseClient,
} from "../../helpers/db"

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

test.describe("INT-06: タグ付きメモ登録→SCR-06でタグ検索ヒット確認", () => {
  test.use({ viewport: { width: 1280, height: 800 }, userAgent: DESKTOP_UA, isMobile: false, hasTouch: false })
  test.setTimeout(60000)

  let db: TestSupabaseClient
  let bookId: string

  test.beforeEach(async () => {
    db = await createTestDb()
    const book = await createTestBook(db)
    bookId = book.id
  })

  test.afterEach(async () => {
    await deleteTestBook(db, bookId)
  })

  test("タグ付きメモを登録すると /memos のタグ検索でヒットする", async ({ page }) => {
    const suffix = Date.now()
    const tagName = `INT06タグ_${suffix}`
    const memoContent = `INT06_メモ_${suffix}`

    await page.goto(`/books/${bookId}`)
    await page.getByRole("button", { name: "メモを追加" }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel("メモ内容").fill(memoContent)
    await dialog.getByPlaceholder("タグを入力...").fill(tagName)
    await page.getByText(`「${tagName}」を作成`).click()
    await expect(dialog.getByText(tagName)).toBeVisible()
    await page.getByRole("button", { name: "登録" }).click()
    await page.getByText("メモを登録しました", { exact: true }).waitFor()

    await page.goto("/memos")
    const searchInput = page.getByPlaceholder("メモ内容・書籍名・著者・タグで検索...")
    await searchInput.fill(tagName)
    await page.waitForTimeout(500)

    await expect(page.locator("tbody tr").filter({ hasText: memoContent })).toHaveCount(1)
  })
})
