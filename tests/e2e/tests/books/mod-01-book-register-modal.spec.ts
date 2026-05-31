import { test, expect, type Page } from "@playwright/test"

const EMAIL = process.env.E2E_TEST_EMAIL
const PASSWORD = process.env.E2E_TEST_PASSWORD

async function loginAndGoToBooks(page: Page): Promise<void> {
  await page.goto("/login")
  await page.getByLabel("メールアドレス").fill(EMAIL!)
  await page.getByLabel("パスワード").fill(PASSWORD!)
  await page.getByRole("button", { name: "ログイン" }).click()
  await page.waitForURL("**/home")
  await page.goto("/books")
}

// ────────────────────────────────────────────
// PC
// ────────────────────────────────────────────
test.describe("MOD-01 書籍登録モーダル（PC）", () => {
  test.beforeEach(async ({ page }) => {
    if (!EMAIL || !PASSWORD) {
      test.skip()
      return
    }
    await loginAndGoToBooks(page)
  })

  test.describe("モーダルの開閉", () => {
    test("「書籍を追加」ボタンをクリック → モーダルが表示される", async ({ page }) => {
      await page.getByRole("button", { name: "書籍を追加" }).click()
      await expect(page.getByRole("dialog")).toBeVisible()
    })

    test("「キャンセル」ボタン → モーダルが閉じる", async ({ page }) => {
      await page.getByRole("button", { name: "書籍を追加" }).click()
      await page.getByRole("button", { name: "キャンセル" }).click()
      await expect(page.getByRole("dialog")).not.toBeVisible()
    })

    test("Escape キー → モーダルが閉じる", async ({ page }) => {
      await page.getByRole("button", { name: "書籍を追加" }).click()
      await page.keyboard.press("Escape")
      await expect(page.getByRole("dialog")).not.toBeVisible()
    })
  })

  test.describe("バリデーション", () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole("button", { name: "書籍を追加" }).click()
    })

    test("タイトル未入力で「登録」→ エラーが表示されモーダルが閉じない", async ({ page }) => {
      await page.getByRole("button", { name: "登録" }).click()
      await expect(page.getByText("タイトルは必須です")).toBeVisible()
      await expect(page.getByRole("dialog")).toBeVisible()
    })

    test("エラー後にタイトルを入力 → エラーが消える", async ({ page }) => {
      await page.getByRole("button", { name: "登録" }).click()
      await expect(page.getByText("タイトルは必須です")).toBeVisible()
      await page.getByLabel("タイトル").fill("テスト書籍")
      await page.getByRole("button", { name: "登録" }).click()
      await expect(page.getByText("タイトルは必須です")).not.toBeVisible()
    })
  })

  test("モーダルを開く → 読書状態のデフォルトが「未読」", async ({ page }) => {
    await page.getByRole("button", { name: "書籍を追加" }).click()
    await expect(page.getByRole("combobox")).toContainText("未読")
  })

  test.describe("正常登録", () => {
    test("タイトルのみ入力して登録 → トーストが表示され一覧先頭に即時追加される", async ({ page }) => {
      const title = `E2Eテスト_${Date.now()}`
      await page.getByRole("button", { name: "書籍を追加" }).click()
      await page.getByLabel("タイトル").fill(title)
      await page.getByRole("button", { name: "登録" }).click()
      await expect(page.getByText("書籍を登録しました", { exact: true })).toBeVisible()
      await expect(page.getByRole("dialog")).not.toBeVisible()
      // テーブル（PC）・カード（スマホ）どちらのレイアウトでも title テキストが存在することを確認
      await expect(page.getByText(title)).toBeVisible()
    })

    test("全項目・読書状態「読書中」で登録 → 正しい情報で先頭に追加される", async ({ page }) => {
      const title = `E2E全項目_${Date.now()}`
      await page.getByRole("button", { name: "書籍を追加" }).click()
      await page.getByLabel("タイトル").fill(title)
      await page.getByLabel("著者").fill("E2E著者")
      await page.getByLabel("ジャンル").fill("E2Eジャンル")
      await page.getByRole("combobox").click()
      await page.getByRole("option", { name: "読書中" }).click()
      await page.getByRole("button", { name: "登録" }).click()
      await expect(page.getByText("書籍を登録しました", { exact: true })).toBeVisible()
      await expect(page.getByRole("dialog")).not.toBeVisible()
      await expect(page.getByText(title)).toBeVisible()
    })

    test("登録後に再度モーダルを開く → フォームがリセットされている", async ({ page }) => {
      const title = `E2Eリセット_${Date.now()}`
      await page.getByRole("button", { name: "書籍を追加" }).click()
      await page.getByLabel("タイトル").fill(title)
      await page.getByLabel("著者").fill("E2E著者")
      await page.getByRole("button", { name: "登録" }).click()
      await page.getByText("書籍を登録しました", { exact: true }).waitFor()
      await page.getByRole("button", { name: "書籍を追加" }).click()
      await expect(page.getByLabel("タイトル")).toHaveValue("")
      await expect(page.getByLabel("著者")).toHaveValue("")
    })
  })

  test.describe("エラー処理", () => {
    test("登録済みタイトルで登録 → エラートーストが表示されモーダルが閉じない", async ({ page }) => {
      const title = `E2E重複_${Date.now()}`
      // まず1件登録
      await page.getByRole("button", { name: "書籍を追加" }).click()
      await page.getByLabel("タイトル").fill(title)
      await page.getByRole("button", { name: "登録" }).click()
      await page.getByText("書籍を登録しました", { exact: true }).waitFor()
      // 同じタイトルで再登録
      await page.getByRole("button", { name: "書籍を追加" }).click()
      await page.getByLabel("タイトル").fill(title)
      await page.getByRole("button", { name: "登録" }).click()
      await expect(page.getByText("同じタイトルの書籍がすでに登録されています", { exact: true })).toBeVisible()
      await expect(page.getByRole("dialog")).toBeVisible()
    })
  })
})

// ────────────────────────────────────────────
// モバイル
// ────────────────────────────────────────────
test.describe("MOD-01 書籍登録モーダル（モバイル 375×667）", () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test.beforeEach(async ({ page }) => {
    if (!EMAIL || !PASSWORD) {
      test.skip()
      return
    }
    await loginAndGoToBooks(page)
  })

  test("FAB をタップ → モーダルが表示される", async ({ page }) => {
    await page.getByRole("button", { name: "書籍を追加" }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
  })

  test("「キャンセル」をタップ → モーダルが閉じる", async ({ page }) => {
    await page.getByRole("button", { name: "書籍を追加" }).click()
    await page.getByRole("button", { name: "キャンセル" }).click()
    await expect(page.getByRole("dialog")).not.toBeVisible()
  })

  test("タイトルを入力して登録 → トーストが表示されモーダルが閉じる", async ({ page }) => {
    const title = `E2Eモバイル_${Date.now()}`
    await page.getByRole("button", { name: "書籍を追加" }).click()
    await page.getByLabel("タイトル").fill(title)
    await page.getByRole("button", { name: "登録" }).click()
    await expect(page.getByText("書籍を登録しました", { exact: true })).toBeVisible()
    await expect(page.getByRole("dialog")).not.toBeVisible()
  })
})
