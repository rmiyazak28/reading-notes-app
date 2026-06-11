import { test, expect } from "@playwright/test"

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

test.describe("INT-01: 書籍登録→ホームの読書中セクション反映", () => {
  test.use({ viewport: { width: 1280, height: 800 }, userAgent: DESKTOP_UA, isMobile: false, hasTouch: false })
  test.setTimeout(60000)

  test("「読書中」で書籍を登録すると /home の読書中セクションに表示される", async ({ page }) => {
    const title = `INT01_${Date.now()}`

    await page.goto("/books")
    await page.getByRole("button", { name: "書籍を追加" }).click()
    await page.getByLabel("タイトル").fill(title)
    await page.getByRole("combobox").click()
    await page.getByRole("option", { name: "読書中" }).click()
    await page.getByRole("button", { name: "登録" }).click()
    await page.getByText("書籍を登録しました", { exact: true }).waitFor()

    await page.goto("/home")

    const readingSection = page.locator("section").filter({ hasText: "読書中" }).first()
    await expect(readingSection.getByText(title)).toBeVisible()
  })
})
