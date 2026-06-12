import { test, expect } from "@playwright/test"
import {
  createTestDb,
  createTestBook,
  createTestMemo,
  deleteTestBook,
  deleteTestMemo,
  type TestSupabaseClient,
} from "../../helpers/db"

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

test.describe("INT-03: SCR-05でお気に入りON→ホームのお気に入りセクション反映", () => {
  test.use({ viewport: { width: 1280, height: 800 }, userAgent: DESKTOP_UA, isMobile: false, hasTouch: false })
  test.setTimeout(60000)

  let db: TestSupabaseClient
  let bookId: string
  let memoId: string
  let memoContent: string

  test.beforeEach(async () => {
    db = await createTestDb()
    const suffix = Date.now()
    memoContent = `INT03_メモ_${suffix}`
    const book = await createTestBook(db)
    bookId = book.id
    const memo = await createTestMemo(db, bookId, { content: memoContent, favorite: false })
    memoId = memo.id
  })

  test.afterEach(async () => {
    await deleteTestMemo(db, memoId)
    await deleteTestBook(db, bookId)
  })

  test("SCR-05のメモ行で★をONにすると /home のお気に入りメモセクションに表示される", async ({ page }) => {
    await page.goto(`/books/${bookId}`)

    const row = page.locator("tbody tr").filter({ hasText: memoContent }).first()
    await row.getByRole("button", { name: "お気に入りに追加" }).click()
    await page.waitForTimeout(500)

    await page.goto("/home")

    const favSection = page.locator("section").filter({ hasText: "お気に入りメモ" })
    await expect(favSection.getByText(memoContent)).toBeVisible()
  })
})
