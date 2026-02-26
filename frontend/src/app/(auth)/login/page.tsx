'use client'

import { FaGoogle } from 'react-icons/fa'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/50">
      <Card className="w-[400px] text-center">
        <CardContent className="pt-6 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-1">bael.ai</h2>
            <p className="text-sm text-muted-foreground">Recruitment CRM</p>
          </div>
          <Button size="lg" className="w-full" onClick={handleGoogleLogin}>
            <FaGoogle className="mr-2 h-4 w-4" />
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
