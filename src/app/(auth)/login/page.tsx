import Link from "next/link"
import { LoginForm } from "@/features/auth/components/login-form"

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm glass rounded-xl p-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="font-serif text-3xl font-bold text-foreground tracking-wide">
            memoLake
          </h1>
          <p className="text-sm text-foreground-secondary">思考を湖のように蓄積する</p>
        </div>

        <LoginForm />

        <p className="text-center text-sm text-foreground-secondary">
          アカウントをお持ちでない方は{" "}
          <Link href="/signup" className="text-lake-accent hover:underline">
            新規登録
          </Link>
        </p>
      </div>
    </main>
  )
}
