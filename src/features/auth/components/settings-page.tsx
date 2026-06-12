"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"
import { updateProfile, signOut, deleteAccount } from "@/features/auth/actions"

// ── Schemas ──────────────────────────────────────────────────────────────────

const nameSchema = z.object({
  name: z.string().min(1, "ユーザー名を入力してください"),
})

const emailSchema = z.object({
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("メール形式で入力してください"),
})

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(1, "パスワードを入力してください")
      .min(8, "パスワードは8文字以上で入力してください")
      .max(72, "パスワードは72文字以内で入力してください")
      .regex(/[a-zA-Z]/, "英字を1文字以上含めてください")
      .regex(/[0-9]/, "数字を1文字以上含めてください"),
    passwordConfirm: z.string().min(1, "確認用パスワードを入力してください"),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    message: "パスワードが一致しません",
    path: ["passwordConfirm"],
  })

type NameValues = z.infer<typeof nameSchema>
type EmailValues = z.infer<typeof emailSchema>
type PasswordValues = z.infer<typeof passwordSchema>

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-xl border border-white/10 p-6 space-y-4">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  userName: string
  userEmail: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SettingsPage({ userName, userEmail }: Props) {
  const router = useRouter()
  const [isSignOutPending, startSignOutTransition] = useTransition()
  const [isDeletePending, startDeleteTransition] = useTransition()

  // ── ユーザー名変更 ────────────────────────────────────────────────────────

  const {
    register: registerName,
    handleSubmit: handleSubmitName,
    formState: { errors: nameErrors, isSubmitting: isNameSubmitting },
  } = useForm<NameValues>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: userName },
  })

  const onSubmitName = async (values: NameValues) => {
    const result = await updateProfile({ name: values.name })
    if (result.error) {
      toast({ title: "更新エラー", description: result.error.message, variant: "destructive" })
      return
    }
    toast({ title: "ユーザー名を更新しました" })
    router.refresh()
  }

  // ── メールアドレス変更 ────────────────────────────────────────────────────

  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    formState: { errors: emailErrors, isSubmitting: isEmailSubmitting },
  } = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: userEmail },
  })

  const onSubmitEmail = async (values: EmailValues) => {
    const result = await updateProfile({ email: values.email })
    if (result.error) {
      toast({ title: "更新エラー", description: result.error.message, variant: "destructive" })
      return
    }
    toast({ title: "メールアドレスを更新しました" })
    router.refresh()
  }

  // ── パスワード変更 ────────────────────────────────────────────────────────

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
  })

  const onSubmitPassword = async (values: PasswordValues) => {
    const result = await updateProfile({ password: values.password, passwordConfirm: values.passwordConfirm })
    if (result.error) {
      toast({ title: "更新エラー", description: result.error.message, variant: "destructive" })
      return
    }
    toast({ title: "パスワードを更新しました" })
    resetPassword()
  }

  // ── ログアウト ────────────────────────────────────────────────────────────

  const handleSignOut = () => {
    startSignOutTransition(async () => {
      await signOut()
      router.push("/login")
    })
  }

  // ── アカウント削除 ────────────────────────────────────────────────────────

  const handleDeleteAccount = () => {
    startDeleteTransition(async () => {
      const result = await deleteAccount()
      if (result.error) {
        toast({ title: "削除エラー", description: result.error.message, variant: "destructive" })
        return
      }
      router.push("/login")
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const inputClass =
    "glass border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground focus:bg-white/10 focus:border-primary/50 transition-colors"

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-6 max-w-lg space-y-4">
        {/* ユーザー名変更 */}
        <Section title="ユーザー名変更">
          <form onSubmit={handleSubmitName(onSubmitName)} className="space-y-3">
            <div className="space-y-1">
              <Input
                {...registerName("name")}
                placeholder="ユーザー名"
                className={inputClass}
                aria-label="ユーザー名"
              />
              {nameErrors.name && (
                <p className="text-sm text-destructive">{nameErrors.name.message}</p>
              )}
            </div>
            <Button
              type="submit"
              disabled={isNameSubmitting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isNameSubmitting ? <Spinner className="h-4 w-4" /> : "更新する"}
            </Button>
          </form>
        </Section>

        {/* メールアドレス変更 */}
        <Section title="メールアドレス変更">
          <form onSubmit={handleSubmitEmail(onSubmitEmail)} className="space-y-3">
            <div className="space-y-1">
              <Input
                {...registerEmail("email")}
                type="email"
                placeholder="メールアドレス"
                className={inputClass}
                aria-label="メールアドレス"
              />
              {emailErrors.email && (
                <p className="text-sm text-destructive">{emailErrors.email.message}</p>
              )}
            </div>
            <Button
              type="submit"
              disabled={isEmailSubmitting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isEmailSubmitting ? <Spinner className="h-4 w-4" /> : "更新する"}
            </Button>
          </form>
        </Section>

        {/* パスワード変更 */}
        <Section title="パスワード変更">
          <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-3">
            <div className="space-y-1">
              <Input
                {...registerPassword("password")}
                type="password"
                placeholder="新しいパスワード"
                className={inputClass}
                aria-label="新しいパスワード"
              />
              {passwordErrors.password && (
                <p className="text-sm text-destructive">{passwordErrors.password.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Input
                {...registerPassword("passwordConfirm")}
                type="password"
                placeholder="パスワード確認"
                className={inputClass}
                aria-label="パスワード確認"
              />
              {passwordErrors.passwordConfirm && (
                <p className="text-sm text-destructive">{passwordErrors.passwordConfirm.message}</p>
              )}
            </div>
            <Button
              type="submit"
              disabled={isPasswordSubmitting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isPasswordSubmitting ? <Spinner className="h-4 w-4" /> : "更新する"}
            </Button>
          </form>
        </Section>

        {/* ログアウト */}
        <Section title="ログアウト">
          <Button
            variant="outline"
            onClick={handleSignOut}
            disabled={isSignOutPending}
            className="w-full glass border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20"
          >
            {isSignOutPending ? <Spinner className="h-4 w-4" /> : "ログアウト"}
          </Button>
        </Section>

        {/* アカウント削除 */}
        <Section title="アカウント削除">
          <p className="text-xs text-muted-foreground">
            アカウントを削除すると、すべての書籍・メモ・タグが完全に削除されます。この操作は取り消せません。
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                disabled={isDeletePending}
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border border-destructive/30"
              >
                {isDeletePending ? <Spinner className="h-4 w-4" /> : "アカウントを削除する"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="glass bg-slate-900/95 border-white/10">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground">アカウントを削除しますか？</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  すべての書籍・メモ・タグが完全に削除されます。この操作は取り消せません。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="glass border-white/10 text-foreground hover:bg-white/10">
                  キャンセル
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                  削除する
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Section>
      </main>
    </div>
  )
}
