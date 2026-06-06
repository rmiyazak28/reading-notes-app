import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/layout/header"

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (!claims) {
    redirect("/login")
  }

  const userName = (claims.user_metadata?.name as string | undefined) ?? claims.email ?? ""

  return (
    <>
      <Header userName={userName} />
      <main>{children}</main>
    </>
  )
}
