'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FaGoogle } from 'react-icons/fa'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageSpinner } from '@/components/ui/spinner'
import { ResultView } from '@/components/ui/result-view'
import { createClient } from '@/lib/supabase/client'

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<unknown>(null)
  const [accepting, setAccepting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; workspaceId?: string; error?: string } | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
  }, [supabase])

  // Auto-accept when user lands back here after OAuth
  useEffect(() => {
    if (!loading && user && !result) {
      handleAccept()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user])

  const handleAccept = async () => {
    setAccepting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/accept-invitation`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to accept invitation')
      setResult({ success: true, workspaceId: data.workspace_id })
      toast.success('Invitation accepted!')
      setTimeout(() => router.push('/'), 2000)
    } catch (err) {
      setResult({ success: false, error: (err as Error).message })
    } finally {
      setAccepting(false)
    }
  }

  const handleLogin = () => {
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/invite/${token}`,
      },
    })
  }

  if (loading) return <PageSpinner />

  if (result?.success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/50">
        <ResultView
          status="success"
          title="Invitation Accepted"
          subTitle="Redirecting to your workspace..."
        />
      </div>
    )
  }

  if (result?.error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/50">
        <ResultView
          status="error"
          title="Failed to accept invitation"
          subTitle={result.error}
          extra={<Button onClick={() => router.push('/')}>Go Home</Button>}
        />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/50">
      <Card className="w-[400px] text-center">
        <CardContent className="pt-6 space-y-6">
          <div>
            <h3 className="text-xl font-semibold">You&apos;ve been invited</h3>
            <p className="text-sm text-muted-foreground">
              Accept this invitation to join a workspace on bael.ai
            </p>
          </div>
          {user ? (
            <Button size="lg" className="w-full" disabled={accepting} onClick={handleAccept}>
              {accepting ? 'Accepting...' : 'Accept Invitation'}
            </Button>
          ) : (
            <Button size="lg" className="w-full" onClick={handleLogin}>
              <FaGoogle className="mr-2 h-4 w-4" />
              Sign in with Google to accept
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
