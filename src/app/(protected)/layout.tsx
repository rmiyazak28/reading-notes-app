import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/layout/header"

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const userName = (user.user_metadata?.name as string | undefined) ?? ""

  return (
    <>
      <Header userName={userName} />
      <main>{children}</main>
    </>
  )
}
