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

/** 書籍を登録して詳細ページへ遷移し、書籍タイトルを返す */
async function createAndGoToBookDetail(page: Page, titleSuffix = ""): Promise<string> {
  const title = `E2E詳細${titleSuffix}_${Date.now()}`
  await page.getByRole("button", { name: "書籍を追加" }).click()
  await page.getByLabel("タイトル").fill(title)
  await page.getByRole("button", { name: "登録" }).click()
  await page.getByText("書籍を登録しました", { exact: true }).waitFor()
  // PC はテーブル行、スマホはカードと表示形式が異なるため、タイトルテキストで遷移する
  const titleEl = page.getByText(title).first()
  await titleEl.waitFor({ state: "visible" })
  await titleEl.click()
  await page.waitForURL(/\/books\/[a-z0-9-]+/)
  return title
}

// ────────────────────────────────────────────
// SCR-05 書籍ヘッダー・ナビゲーション（PC）
// ────────────────────────────────────────────
test.describe("SCR-05 書籍詳細画面（PC）", () => {
  test.beforeEach(async ({ page }) => {
    if (!EMAIL || !PASSWORD) {
      test.skip()
      return
    }
    await loginAndGoToBooks(page)
  })

  test.describe("書籍ヘッダー表示", () => {
    test("タイトルが表示される", async ({ page }) => {
      const title = await createAndGoToBookDetail(page)
      await expect(page.getByRole("heading", { name: title })).toBeVisible()
    })

    test("メモ数・お気に入り数が表示される", async ({ page }) => {
      await createAndGoToBookDetail(page)
      await expect(page.getByText("メモ 0 件")).toBeVisible()
      await expect(page.getByText("お気に入り 0 件")).toBeVisible()
    })

    test("メモがない場合「メモはまだありません」が表示される", async ({ page }) => {
      await createAndGoToBookDetail(page)
      await expect(page.getByText("メモはまだありません")).toBeVisible()
    })
  })

  test.describe("パンくずリスト", () => {
    test("「書籍一覧 > タイトル」が表示される", async ({ page }) => {
      const title = await createAndGoToBookDetail(page)
      // パンくずは main コンテンツ内にあるため locator("main") で絞り込む（ヘッダーナビと区別）
      await expect(page.locator("main").getByRole("link", { name: "書籍一覧" })).toBeVisible()
      await expect(page.getByRole("heading", { name: title })).toBeVisible()
    })

    test("「書籍一覧」リンクをクリックすると /books に遷移する", async ({ page }) => {
      await createAndGoToBookDetail(page)
      await page.locator("main").getByRole("link", { name: "書籍一覧" }).click()
      await expect(page).toHaveURL(/\/books$/)
    })
  })

  test.describe("メモ検索", () => {
    test("検索バーが表示されキーワードを入力できる", async ({ page }) => {
      await createAndGoToBookDetail(page)
      const searchBar = page.getByPlaceholder("メモ内容・タグで検索...")
      await expect(searchBar).toBeVisible()
      await searchBar.fill("テスト")
      // メモが0件のためフィルタ後も「メモはまだありません」が表示される
      await expect(page.getByText("メモはまだありません")).toBeVisible()
    })
  })
})

// ────────────────────────────────────────────
// MOD-02 書籍編集モーダル（PC）
// ────────────────────────────────────────────
test.describe("MOD-02 書籍編集モーダル（PC）", () => {
  test.beforeEach(async ({ page }) => {
    if (!EMAIL || !PASSWORD) {
      test.skip()
      return
    }
    await loginAndGoToBooks(page)
  })

  test.describe("モーダルの開閉", () => {
    test("「編集」ボタンをクリックするとモーダルが表示される", async ({ page }) => {
      await createAndGoToBookDetail(page)
      await page.getByRole("button", { name: "書籍を編集" }).click()
      await expect(page.getByRole("dialog")).toBeVisible()
    })

    test("「キャンセル」をクリックするとモーダルが閉じる", async ({ page }) => {
      await createAndGoToBookDetail(page)
      await page.getByRole("button", { name: "書籍を編集" }).click()
      await page.getByRole("button", { name: "キャンセル" }).click()
      await expect(page.getByRole("dialog")).not.toBeVisible()
    })

    test("Escape キーでモーダルが閉じる", async ({ page }) => {
      await createAndGoToBookDetail(page)
      await page.getByRole("button", { name: "書籍を編集" }).click()
      await page.keyboard.press("Escape")
      await expect(page.getByRole("dialog")).not.toBeVisible()
    })

    test("モーダルを開くと現在の書籍情報が初期値として入力されている", async ({ page }) => {
      const title = await createAndGoToBookDetail(page)
      await page.getByRole("button", { name: "書籍を編集" }).click()
      await expect(page.getByLabel("タイトル")).toHaveValue(title)
    })

    test("キャンセル後に再表示すると編集前の値に戻っている", async ({ page }) => {
      const title = await createAndGoToBookDetail(page)
      await page.getByRole("button", { name: "書籍を編集" }).click()
      await page.getByLabel("タイトル").fill("")
      await page.getByRole("button", { name: "キャンセル" }).click()
      await page.getByRole("button", { name: "書籍を編集" }).click()
      await expect(page.getByLabel("タイトル")).toHaveValue(title)
    })
  })

  test.describe("バリデーション", () => {
    test("タイトルを空にして更新 → エラーが表示されモーダルが閉じない", async ({ page }) => {
      await createAndGoToBookDetail(page)
      await page.getByRole("button", { name: "書籍を編集" }).click()
      await page.getByLabel("タイトル").fill("")
      await page.getByRole("button", { name: "更新" }).click()
      await expect(page.getByText("タイトルは必須です")).toBeVisible()
      await expect(page.getByRole("dialog")).toBeVisible()
    })
  })

  test.describe("読了日フィールドの表示制御", () => {
    test("読書状態「読了」に変更 → 読了日フィールドが表示される", async ({ page }) => {
      await createAndGoToBookDetail(page)
      await page.getByRole("button", { name: "書籍を編集" }).click()
      await page.getByRole("combobox").click()
      await page.getByRole("option", { name: "読了" }).click()
      await expect(page.getByLabel(/読了日/)).toBeVisible()
    })

    test("読書状態「読書中」では読了日フィールドが非表示", async ({ page }) => {
      await createAndGoToBookDetail(page)
      await page.getByRole("button", { name: "書籍を編集" }).click()
      await page.getByRole("combobox").click()
      await page.getByRole("option", { name: "読書中" }).click()
      await expect(page.getByLabel(/読了日/)).not.toBeVisible()
    })

    test("読書状態「未読」では読了日フィールドが非表示", async ({ page }) => {
      await createAndGoToBookDetail(page)
      await page.getByRole("button", { name: "書籍を編集" }).click()
      await page.getByRole("combobox").click()
      await page.getByRole("option", { name: "未読" }).click()
      await expect(page.getByLabel(/読了日/)).not.toBeVisible()
    })
  })

  test.describe("正常更新", () => {
    test("タイトルを変更して更新 → ヘッダーのタイトルが即時反映される", async ({ page }) => {
      await createAndGoToBookDetail(page)
      const newTitle = `E2E更新タイトル_${Date.now()}`
      await page.getByRole("button", { name: "書籍を編集" }).click()
      await page.getByLabel("タイトル").fill(newTitle)
      await page.getByRole("button", { name: "更新" }).click()
      await expect(page.getByText("書籍情報を更新しました", { exact: true })).toBeVisible()
      await expect(page.getByRole("dialog")).not.toBeVisible()
      await expect(page.getByRole("heading", { name: newTitle })).toBeVisible()
    })

    test("読書状態を「読了」・読了日を入力して更新 → 正常に更新される", async ({ page }) => {
      await createAndGoToBookDetail(page)
      await page.getByRole("button", { name: "書籍を編集" }).click()
      await page.getByRole("combobox").click()
      await page.getByRole("option", { name: "読了" }).click()
      await page.getByLabel(/読了日/).fill("2026-05-31")
      await page.getByRole("button", { name: "更新" }).click()
      await expect(page.getByText("書籍情報を更新しました", { exact: true })).toBeVisible()
      await expect(page.getByRole("dialog")).not.toBeVisible()
    })
  })

  test.describe("書籍削除", () => {
    test("削除ボタン → 確認ダイアログが表示される", async ({ page }) => {
      await createAndGoToBookDetail(page)
      await page.getByRole("button", { name: "書籍を編集" }).click()
      await page.getByRole("button", { name: "削除" }).click()
      await expect(page.getByRole("alertdialog")).toBeVisible()
    })

    test("確認ダイアログの「キャンセル」→ ダイアログが閉じ編集モーダルは残る", async ({ page }) => {
      await createAndGoToBookDetail(page)
      await page.getByRole("button", { name: "書籍を編集" }).click()
      await page.getByRole("button", { name: "削除" }).click()
      await page.getByRole("button", { name: "キャンセル" }).click()
      await expect(page.getByRole("alertdialog")).not.toBeVisible()
      await expect(page.getByRole("dialog")).toBeVisible()
    })

    test("「削除する」をクリック → /books に遷移する", async ({ page }) => {
      await createAndGoToBookDetail(page)
      await page.getByRole("button", { name: "書籍を編集" }).click()
      await page.getByRole("button", { name: "削除" }).click()
      await page.getByRole("button", { name: "削除する" }).click()
      await expect(page.getByText("書籍を削除しました", { exact: true })).toBeVisible()
      await expect(page).toHaveURL(/\/books$/)
    })
  })
})

// ────────────────────────────────────────────
// スマホ
// ────────────────────────────────────────────
test.describe("SCR-05 書籍詳細画面（モバイル 375×667）", () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test.beforeEach(async ({ page }) => {
    if (!EMAIL || !PASSWORD) {
      test.skip()
      return
    }
    await loginAndGoToBooks(page)
  })

  test("戻るボタンが表示される", async ({ page }) => {
    await createAndGoToBookDetail(page)
    await expect(page.getByRole("link", { name: "書籍一覧へ戻る" })).toBeVisible()
  })

  test("戻るボタンをタップすると /books に遷移する", async ({ page }) => {
    await createAndGoToBookDetail(page)
    await page.getByRole("link", { name: "書籍一覧へ戻る" }).click()
    await expect(page).toHaveURL(/\/books$/)
  })

  test("ハンバーガーをタップするとドロワーが表示される", async ({ page }) => {
    await createAndGoToBookDetail(page)
    // グローバルヘッダーとオーバーレイの2つのハンバーガーがあるため .last() でオーバーレイ側を指定
    await page.getByRole("button", { name: "メニューを開く" }).last().click()
    await expect(page.getByRole("dialog")).toBeVisible()
  })
})
