import { getHomeData } from "@/features/home/actions"
import { HomePage } from "@/features/home/components/home-page"

export default async function Page() {
  const result = await getHomeData()
  if (result.error) throw new Error(result.error.message)

  return <HomePage initialData={result.data} />
}
