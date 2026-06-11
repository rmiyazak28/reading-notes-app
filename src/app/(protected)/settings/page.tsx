import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SettingsPage } from "@/features/auth/components/settings-page"

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const userName = (user.user_metadata?.name as string | undefined) ?? ""
  const userEmail = user.email ?? ""

  return <SettingsPage userName={userName} userEmail={userEmail} />
}
