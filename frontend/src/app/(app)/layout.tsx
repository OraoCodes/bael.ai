import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AuthProvider } from '@/components/providers/auth-provider'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // getSession() is safe here for client hydration — auth is already validated above
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return <AuthProvider initialSession={session}>{children}</AuthProvider>
}
