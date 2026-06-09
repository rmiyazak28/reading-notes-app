import { test as setup } from "@playwright/test"
import path from "path"

export const AUTH_FILE = path.join(__dirname, "../.auth/user.json")

setup("authenticate", async ({ page }) => {
  const EMAIL = process.env.E2E_TEST_EMAIL
  const PASSWORD = process.env.E2E_TEST_PASSWORD
  if (!EMAIL || !PASSWORD) throw new Error("E2E_TEST_EMAIL / E2E_TEST_PASSWORD が未設定")

  await page.goto("/login")
  await page.getByLabel("メールアドレス").fill(EMAIL)
  await page.getByLabel("パスワード").fill(PASSWORD)
  await page.getByRole("button", { name: "ログイン" }).click()
  await page.waitForURL("**/home")
  await page.context().storageState({ path: AUTH_FILE })
})
