import { test, expect } from "@playwright/test"
import {
  createTestDb,
  createTestBook,
  deleteTestBook,
  type TestSupabaseClient,
} from "../../helpers/db"

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

test.describe("INT-02: メモ登録→ホームの最近のメモ反映", () => {
  test.use({ viewport: { width: 1280, height: 800 }, userAgent: DESKTOP_UA, isMobile: false, hasTouch: false })
  test.setTimeout(60000)

  let db: TestSupabaseClient
  let bookId: string

  test.beforeEach(async () => {
    db = await createTestDb()
    const book = await createTestBook(db, { status: "reading" })
    bookId = book.id
  })

  test.afterEach(async () => {
    await deleteTestBook(db, bookId)
  })

  test("MOD-03でメモを登録すると /home の最近のメモセクションに表示される", async ({ page }) => {
    const memoContent = `INT02_${Date.now()}`

    await page.goto(`/books/${bookId}`)
    await page.getByRole("button", { name: "メモを追加" }).click()
    await page.getByRole("dialog").getByLabel("メモ内容").fill(memoContent)
    await page.getByRole("button", { name: "登録" }).click()
    await page.getByText("メモを登録しました", { exact: true }).waitFor()

    await page.goto("/home")

    const recentSection = page.locator("section").filter({ hasText: "最近のメモ" })
    await expect(recentSection.getByText(memoContent)).toBeVisible()
  })
})
