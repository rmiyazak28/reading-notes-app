import Link from "next/link"
import { SignupForm } from "@/features/auth/components/signup-form"

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm glass rounded-xl p-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="font-serif text-3xl font-bold text-[#f1f5f9] tracking-wide">
            memoLake
          </h1>
          <p className="text-sm text-[#cbd5e1]">アカウントを作成する</p>
        </div>

        <SignupForm />

        <p className="text-center text-sm text-[#cbd5e1]">
          すでにアカウントをお持ちの方は{" "}
          <Link href="/login" className="text-[#22d3ee] hover:underline">
            ログイン
          </Link>
        </p>
      </div>
    </main>
  )
}
