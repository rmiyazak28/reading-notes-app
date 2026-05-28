"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/hooks/use-toast"
import { signInWithEmail, signInWithGoogle } from "@/features/auth/actions"

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("メール形式で入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginForm() {
  const router = useRouter()
  const [isEmailPending, startEmailTransition] = useTransition()
  const [isGooglePending, startGoogleTransition] = useTransition()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = (values: LoginFormValues) => {
    startEmailTransition(async () => {
      const result = await signInWithEmail(values)
      if (result.error) {
        toast({
          title: "ログインエラー",
          description: result.error.message,
          variant: "destructive",
        })
        return
      }
      router.push("/home")
    })
  }

  const handleGoogleLogin = () => {
    startGoogleTransition(async () => {
      const result = await signInWithGoogle()
      if (result.error) {
        toast({
          title: "エラー",
          description: result.error.message,
          variant: "destructive",
        })
        return
      }
      // Server Action はブラウザリダイレクト不可のため URL を受け取ってここで遷移する。
      // router.push() では OAuth フロー中の Cookie セットが正常に完了しない。
      window.location.href = result.data.url
    })
  }

  const isAnyPending = isEmailPending || isGooglePending

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm text-[#cbd5e1]" htmlFor="email">
          メールアドレス
        </label>
        <Input
          id="email"
          type="email"
          placeholder="example@email.com"
          autoComplete="email"
          className="glass border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground focus:bg-white/10 focus:border-primary/50 transition-colors"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-[#cbd5e1]" htmlFor="password">
          パスワード
        </label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          className="glass border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground focus:bg-white/10 focus:border-primary/50 transition-colors"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isAnyPending}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        {isEmailPending && <Spinner />}
        ログイン
      </Button>

      <div className="relative flex items-center gap-3 py-1">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-[#cbd5e1]">または</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <Button
        type="button"
        variant="outline"
        disabled={isAnyPending}
        onClick={handleGoogleLogin}
        className="w-full border-white/10 bg-white/5 text-[#f1f5f9] hover:bg-white/10"
      >
        {isGooglePending && <Spinner />}
        Googleでログイン
      </Button>
    </form>
  )
}
