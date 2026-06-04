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

/** 書籍を登録して詳細ページへ遷移し、書籍IDとタイトルを返す */
async function createAndGoToBookDetail(
  page: Page,
  titleSuffix = ""
): Promise<{ bookId: string; title: string }> {
  const title = `E2Eメモ${titleSuffix}_${Date.now()}`
  await page.getByRole("button", { name: "書籍を追加" }).click()
  await page.getByLabel("タイトル").fill(title)
  await page.getByRole("button", { name: "登録" }).click()
  await page.getByText("書籍を登録しました", { exact: true }).waitFor()
  const titleEl = page.getByText(title).first()
  await titleEl.waitFor({ state: "visible" })
  await titleEl.click()
  await page.waitForURL(/\/books\/[a-z0-9-]+/)
  const url = page.url()
  const bookId = url.split("/books/")[1].split("/")[0]
  return { bookId, title }
}

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

// ────────────────────────────────────────────
// MOD-03 読書メモ登録モーダル（PC）
// ────────────────────────────────────────────
test.describe("MOD-03 読書メモ登録モーダル（PC）", () => {
  // SCR-07 は UA でスマホ判定するため、モバイルプロジェクトでもデスクトップ UA を強制する
  test.use({ viewport: { width: 1280, height: 800 }, userAgent: DESKTOP_UA })

  test.beforeEach(async ({ page }) => {
    if (!EMAIL || !PASSWORD) {
      test.skip()
      return
    }
    await loginAndGoToBooks(page)
  })

  test.describe("モーダルの開閉", () => {
    test("「メモを追加」ボタンをクリック → モーダルが表示される", async ({ page }) => {
      await createAndGoToBookDetail(page)
      await page.getByRole("button", { name: "メモを追加" }).click()
      await expect(page.getByRole("dialog")).toBeVisible()
    })

    test("モーダルを開いた初期状態を確認する", async ({ page }) => {
      await createAndGoToBookDetail(page)
      await page.getByRole("button", { name: "メモを追加" }).click()
      const dialog = page.getByRole("dialog")
      await expect(dialog.getByLabel("ページ数")).toHaveValue("")
      await expect(dialog.getByLabel("メモ内容")).toHaveValue("")
    })

    test("「キャンセル」ボタン → モーダルが閉じる", async ({ page }) => {
      await createAndGoToBookDetail(page)
      await page.getByRole("button", { name: "メモを追加" }).click()
      await page.getByRole("button", { name: "キャンセル" }).click()
      await expect(page.getByRole("dialog")).not.toBeVisible()
    })

    test("Escape キー → モーダルが閉じる", async ({ page }) => {
      await createAndGoToBookDetail(page)
      await page.getByRole("button", { name: "メモを追加" }).click()
      await page.keyboard.press("Escape")
      await expect(page.getByRole("dialog")).not.toBeVisible()
    })

    test("モーダルを閉じて再度開く → 入力がリセットされている", async ({ page }) => {
      await createAndGoToBookDetail(page)
      await page.getByRole("button", { name: "メモを追加" }).click()
      await page.getByRole("dialog").getByLabel("メモ内容").fill("テスト入力")
      await page.getByRole("button", { name: "キャンセル" }).click()
      await page.getByRole("button", { name: "メモを追加" }).click()
      await expect(page.getByRole("dialog").getByLabel("メモ内容")).toHaveValue("")
    })
  })

  test.describe("バリデーション", () => {
    test.beforeEach(async ({ page }) => {
      await createAndGoToBookDetail(page)
      await page.getByRole("button", { name: "メモを追加" }).click()
    })

    test("メモ内容未入力で「登録」→ エラーが表示されモーダルが閉じない", async ({ page }) => {
      await page.getByRole("button", { name: "登録" }).click()
      await expect(page.getByText("メモ内容は必須です")).toBeVisible()
      await expect(page.getByRole("dialog")).toBeVisible()
    })

    test("ページ数に「0」を入力して「登録」→ エラーが表示される", async ({ page }) => {
      const dialog = page.getByRole("dialog")
      await dialog.getByLabel("ページ数").fill("0")
      await dialog.getByLabel("メモ内容").fill("テスト")
      await dialog.getByRole("button", { name: "登録" }).click()
      await expect(dialog.getByText("1以上の整数で入力してください")).toBeVisible()
    })

    test("ページ数に「-1」を入力して「登録」→ エラーが表示される", async ({ page }) => {
      const dialog = page.getByRole("dialog")
      await dialog.getByLabel("ページ数").fill("-1")
      await dialog.getByLabel("メモ内容").fill("テスト")
      await dialog.getByRole("button", { name: "登録" }).click()
      await expect(dialog.getByText("1以上の整数で入力してください")).toBeVisible()
    })

    test("エラー後に正しい値を入力 → エラーメッセージが消える", async ({ page }) => {
      await page.getByRole("button", { name: "登録" }).click()
      await expect(page.getByText("メモ内容は必須です")).toBeVisible()
      await page.getByRole("dialog").getByLabel("メモ内容").fill("修正メモ")
      await expect(page.getByText("メモ内容は必須です")).not.toBeVisible()
    })
  })

  test.describe("正常登録", () => {
    test("メモ内容のみ入力して登録 → トーストが表示され一覧先頭に追加される", async ({ page }) => {
      await createAndGoToBookDetail(page)
      await page.getByRole("button", { name: "メモを追加" }).click()
      await page.getByRole("dialog").getByLabel("メモ内容").fill("E2Eテストメモ")
      await page.getByRole("button", { name: "登録" }).click()
      await expect(page.getByText("メモを登録しました", { exact: true })).toBeVisible()
      await expect(page.getByRole("dialog")).not.toBeVisible()
      await expect(page.getByText("E2Eテストメモ")).toBeVisible()
    })

    test("全項目入力して登録 → ページ数・お気に入りが反映される", async ({ page }) => {
      await createAndGoToBookDetail(page)
      await page.getByRole("button", { name: "メモを追加" }).click()
      const dialog = page.getByRole("dialog")
      await dialog.getByLabel("ページ数").fill("123")
      await dialog.getByLabel("メモ内容").fill("全項目E2Eテスト")
      // ★ お気に入りを ON にする
      await dialog.getByRole("button", { name: /お気に入り/ }).click()
      await page.getByRole("button", { name: "登録" }).click()
      await expect(page.getByText("メモを登録しました", { exact: true })).toBeVisible()
      await expect(page.getByRole("dialog")).not.toBeVisible()
      await expect(page.getByText("全項目E2Eテスト")).toBeVisible()
      await expect(page.getByText("p.123")).toBeVisible()
    })

    test("登録後にメモ数カウントが増える", async ({ page }) => {
      await createAndGoToBookDetail(page)
      await expect(page.getByText("メモ 0 件")).toBeVisible()
      await page.getByRole("button", { name: "メモを追加" }).click()
      await page.getByRole("dialog").getByLabel("メモ内容").fill("カウントテスト")
      await page.getByRole("button", { name: "登録" }).click()
      await page.getByText("メモを登録しました", { exact: true }).waitFor()
      await expect(page.getByText("メモ 1 件")).toBeVisible()
    })

    test("お気に入り登録後にお気に入り数カウントが増える", async ({ page }) => {
      await createAndGoToBookDetail(page)
      await expect(page.getByText("お気に入り 0 件")).toBeVisible()
      await page.getByRole("button", { name: "メモを追加" }).click()
      const dialog = page.getByRole("dialog")
      await dialog.getByLabel("メモ内容").fill("お気に入りカウントテスト")
      await dialog.getByRole("button", { name: /お気に入り/ }).click()
      await page.getByRole("button", { name: "登録" }).click()
      await page.getByText("メモを登録しました", { exact: true }).waitFor()
      await expect(page.getByText("お気に入り 1 件")).toBeVisible()
    })
  })

  test.describe("タグ入力", () => {
    test("新規タグを作成して登録 → タグがメモに表示される", async ({ page }) => {
      await createAndGoToBookDetail(page)
      await page.getByRole("button", { name: "メモを追加" }).click()
      const dialog = page.getByRole("dialog")
      await dialog.getByLabel("メモ内容").fill("タグテスト")
      const tagName = `E2Eタグ_${Date.now()}`
      await dialog.getByPlaceholder("タグを入力...").fill(tagName)
      await page.getByText(`「${tagName}」を作成`).click()
      // チップが表示される
      await expect(dialog.getByText(tagName)).toBeVisible()
      await page.getByRole("button", { name: "登録" }).click()
      await page.getByText("メモを登録しました", { exact: true }).waitFor()
      await expect(page.getByText(`#${tagName}`)).toBeVisible()
    })

    test("チップの × をクリック → タグが除去される", async ({ page }) => {
      await createAndGoToBookDetail(page)
      await page.getByRole("button", { name: "メモを追加" }).click()
      const dialog = page.getByRole("dialog")
      const tagName = `E2E削除タグ_${Date.now()}`
      await dialog.getByPlaceholder("タグを入力...").fill(tagName)
      await page.getByText(`「${tagName}」を作成`).click()
      await expect(dialog.getByText(tagName)).toBeVisible()
      // チップの × ボタンをクリック
      await dialog.getByRole("button", { name: `${tagName}を削除` }).click()
      await expect(dialog.getByText(tagName)).not.toBeVisible()
    })
  })

  test.describe("キャンセル操作", () => {
    test("入力後「キャンセル」→ モーダルが閉じメモが登録されない", async ({ page }) => {
      await createAndGoToBookDetail(page)
      await page.getByRole("button", { name: "メモを追加" }).click()
      await page.getByRole("dialog").getByLabel("メモ内容").fill("キャンセルテスト")
      await page.getByRole("button", { name: "キャンセル" }).click()
      await expect(page.getByRole("dialog")).not.toBeVisible()
      await expect(page.getByText("キャンセルテスト")).not.toBeVisible()
    })

    test("キャンセル後に再度モーダルを開く → 入力がリセットされている", async ({ page }) => {
      await createAndGoToBookDetail(page)
      await page.getByRole("button", { name: "メモを追加" }).click()
      await page.getByRole("dialog").getByLabel("メモ内容").fill("リセット確認テスト")
      await page.getByRole("button", { name: "キャンセル" }).click()
      await page.getByRole("button", { name: "メモを追加" }).click()
      await expect(page.getByRole("dialog").getByLabel("メモ内容")).toHaveValue("")
    })
  })
})

// ────────────────────────────────────────────
// SCR-07 読書メモ登録画面（モバイル 375×667）
// ────────────────────────────────────────────
// SCR-07 はサーバーサイドで UA を見てリダイレクトするため、モバイル UA が必須
const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36"

test.describe("SCR-07 読書メモ登録画面（モバイル 375×667）", () => {
  test.use({ viewport: { width: 375, height: 667 }, userAgent: MOBILE_UA })

  test.beforeEach(async ({ page }) => {
    if (!EMAIL || !PASSWORD) {
      test.skip()
      return
    }
    await loginAndGoToBooks(page)
  })

  test.describe("画面遷移", () => {
    test("FAB（＋）をタップ → /books/[id]/memo/new に遷移する", async ({ page }) => {
      await createAndGoToBookDetail(page)
      await page.getByRole("button", { name: "メモを追加" }).click()
      await expect(page).toHaveURL(/\/books\/[a-z0-9-]+\/memo\/new/)
    })

    test("SCR-07 のヘッダーに「メモを追加」が表示される", async ({ page }) => {
      await createAndGoToBookDetail(page)
      await page.getByRole("button", { name: "メモを追加" }).click()
      await page.waitForURL(/\/books\/[a-z0-9-]+\/memo\/new/)
      await expect(page.getByText("メモを追加")).toBeVisible()
    })

    test("「←」ボタンをタップ → 書籍詳細画面に戻る", async ({ page }) => {
      const { bookId } = await createAndGoToBookDetail(page)
      await page.getByRole("button", { name: "メモを追加" }).click()
      await page.waitForURL(/\/books\/[a-z0-9-]+\/memo\/new/)
      await page.getByRole("button", { name: "戻る" }).click()
      await expect(page).toHaveURL(new RegExp(`/books/${bookId}$`))
    })
  })

  test.describe("PC からのリダイレクト", () => {
    test.use({ viewport: { width: 1280, height: 800 }, userAgent: DESKTOP_UA })

    test("PC 幅で /books/[id]/memo/new に直接アクセス → 書籍詳細画面にリダイレクト", async ({
      page,
    }) => {
      const { bookId } = await createAndGoToBookDetail(page)
      await page.goto(`/books/${bookId}/memo/new`)
      await expect(page).toHaveURL(new RegExp(`/books/${bookId}$`))
    })
  })

  test.describe("バリデーション", () => {
    test.beforeEach(async ({ page }) => {
      await createAndGoToBookDetail(page)
      await page.getByRole("button", { name: "メモを追加" }).click()
      await page.waitForURL(/\/books\/[a-z0-9-]+\/memo\/new/)
    })

    test("メモ内容未入力で「登録」→ エラーが表示される", async ({ page }) => {
      await page.getByRole("button", { name: "登録" }).click()
      await expect(page.getByText("メモ内容は必須です")).toBeVisible()
    })

    test("ページ数に「0」を入力して「登録」→ エラーが表示される", async ({ page }) => {
      await page.getByLabel("ページ数").fill("0")
      await page.getByLabel("メモ内容").fill("テスト")
      await page.getByRole("button", { name: "登録" }).click()
      await expect(page.getByText("1以上の整数で入力してください")).toBeVisible()
    })
  })

  test.describe("正常登録", () => {
    test("メモ内容のみ入力して登録 → トーストが表示され書籍詳細に戻る", async ({ page }) => {
      const { bookId } = await createAndGoToBookDetail(page)
      await page.getByRole("button", { name: "メモを追加" }).click()
      await page.waitForURL(/\/books\/[a-z0-9-]+\/memo\/new/)
      await page.getByLabel("メモ内容").fill("スマホE2Eテストメモ")
      await page.getByRole("button", { name: "登録" }).click()
      await expect(page.getByText("メモを登録しました", { exact: true })).toBeVisible()
      await expect(page).toHaveURL(new RegExp(`/books/${bookId}$`))
      await expect(page.getByText("スマホE2Eテストメモ")).toBeVisible()
    })

    test("登録後にメモ数カウントが増える", async ({ page }) => {
      await createAndGoToBookDetail(page)
      await expect(page.getByText("メモ 0 件")).toBeVisible()
      await page.getByRole("button", { name: "メモを追加" }).click()
      await page.waitForURL(/\/books\/[a-z0-9-]+\/memo\/new/)
      await page.getByLabel("メモ内容").fill("スマホカウントテスト")
      await page.getByRole("button", { name: "登録" }).click()
      await page.getByText("メモを登録しました", { exact: true }).waitFor()
      await expect(page.getByText("メモ 1 件")).toBeVisible()
    })
  })

  test.describe("キャンセル操作", () => {
    test("メモ入力後「キャンセル」→ 書籍詳細画面に戻りメモが登録されない", async ({ page }) => {
      const { bookId } = await createAndGoToBookDetail(page)
      await page.getByRole("button", { name: "メモを追加" }).click()
      await page.waitForURL(/\/books\/[a-z0-9-]+\/memo\/new/)
      await page.getByLabel("メモ内容").fill("スマホキャンセルテスト")
      await page.getByRole("button", { name: "キャンセル" }).click()
      await expect(page).toHaveURL(new RegExp(`/books/${bookId}$`))
      await expect(page.getByText("スマホキャンセルテスト")).not.toBeVisible()
    })
  })
})
