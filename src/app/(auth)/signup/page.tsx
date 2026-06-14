import Link from "next/link"
import { SignupForm } from "@/features/auth/components/signup-form"

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm glass rounded-xl p-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="font-serif text-3xl font-bold text-foreground tracking-wide">
            memoLake
          </h1>
          <p className="text-sm text-foreground-secondary">アカウントを作成する</p>
        </div>

        <p className="text-sm text-center text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          現在、新規登録は受け付けていません。
        </p>

        <SignupForm />

        <p className="text-center text-sm text-foreground-secondary">
          すでにアカウントをお持ちの方は{" "}
          <Link href="/login" className="text-lake-accent hover:underline">
            ログイン
          </Link>
        </p>
      </div>
    </main>
  )
}
