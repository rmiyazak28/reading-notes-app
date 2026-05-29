"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/hooks/use-toast"
import { Eye, EyeOff } from "lucide-react"
import { signUpWithEmail, signInWithGoogle } from "@/features/auth/actions"

const signupSchema = z
  .object({
    name: z.string().min(1, "ユーザー名を入力してください"),
    email: z
      .string()
      .min(1, "メールアドレスを入力してください")
      .email("メール形式で入力してください"),
    password: z
      .string()
      .min(1, "パスワードを入力してください")
      .min(8, "パスワードは8文字以上で入力してください")
      .max(72, "パスワードは72文字以内で入力してください")
      .regex(/[a-zA-Z]/, "英字を1文字以上含めてください")
      .regex(/[0-9]/, "数字を1文字以上含めてください"),
    confirmPassword: z.string().min(1, "パスワード（確認）を入力してください"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "パスワードが一致しません",
    path: ["confirmPassword"],
  })

type SignupFormValues = z.infer<typeof signupSchema>

export function SignupForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isGooglePending, startGoogleTransition] = useTransition()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = (values: SignupFormValues) => {
    startTransition(async () => {
      const result = await signUpWithEmail({
        name: values.name,
        email: values.email,
        password: values.password,
      })
      if (result.error) {
        toast({
          title: "登録エラー",
          description: result.error.message,
          variant: "destructive",
        })
        return
      }
      toast({
        title: "登録完了",
        description: "アカウントを作成しました。ログインしてください。",
      })
      // Supabase のメール確認フローが有効な場合、確認メール送信前に自動ログインさせないため
      // 登録直後は /login へ誘導する。
      router.push("/login")
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

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const isAnyPending = isPending || isGooglePending

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label className="text-sm text-[#cbd5e1]" htmlFor="name">
          ユーザー名
        </label>
        <Input
          id="name"
          type="text"
          placeholder="あなたの名前"
          autoComplete="name"
          className="glass border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground focus:bg-white/10 focus:border-primary/50 transition-colors"
          {...register("name")}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

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
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="new-password"
            className="glass border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground focus:bg-white/10 focus:border-primary/50 transition-colors"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <span className="sr-only">{showPassword ? "パスワードを隠す" : "パスワードを表示"}</span>
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-[#cbd5e1]" htmlFor="confirmPassword">
          パスワード（確認）
        </label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="new-password"
            className="glass border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground focus:bg-white/10 focus:border-primary/50 transition-colors"
            {...register("confirmPassword")}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <span className="sr-only">{showConfirmPassword ? "パスワードを隠す" : "パスワードを表示"}</span>
            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isAnyPending}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        {isPending && <Spinner />}
        アカウントを作成
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
        Googleで登録
      </Button>
    </form>
  )
}
