'use client'

import { FaGoogle } from 'react-icons/fa'
import { MessageCircle, Bell, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
    <div className="flex min-h-screen">
      {/* Left — Value proposition */}
      <div className="hidden lg:flex lg:w-[60%] flex-col justify-between bg-primary text-primary-foreground p-12">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">bael.ai</h1>
        </div>

        <div className="space-y-10">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold leading-tight max-w-lg">
              Recruitment should be proactive, not reactive.
            </h2>
            <p className="text-primary-foreground/70 text-lg max-w-md">
              Stop losing great candidates to silence. bael.ai keeps every conversation moving forward.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-0.5 rounded-lg bg-white/10 p-2.5">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">No more ghosting</h3>
                <p className="text-primary-foreground/70 text-sm mt-0.5">
                  Automated follow-ups and stagnation alerts keep candidates engaged and your pipeline healthy.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-0.5 rounded-lg bg-white/10 p-2.5">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Conversational recruiting</h3>
                <p className="text-primary-foreground/70 text-sm mt-0.5">
                  Create and manage jobs through natural conversation — via Telegram, LinkedIn, or AI chat.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-0.5 rounded-lg bg-white/10 p-2.5">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">AI-powered matching</h3>
                <p className="text-primary-foreground/70 text-sm mt-0.5">
                  Let AI score and rank your candidates against every open role — instantly.
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-primary-foreground/50 text-sm">
          The future of recruitment is agentic.
        </p>
      </div>

      {/* Right — Login */}
      <div className="flex flex-1 items-center justify-center bg-muted/50 p-8">
        <div className="w-full max-w-[360px] space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold">Welcome to bael.ai</h2>
            <p className="text-sm text-muted-foreground">
              Sign in to your recruitment workspace
            </p>
          </div>

          <Button size="lg" className="w-full" onClick={handleGoogleLogin}>
            <FaGoogle className="mr-2 h-4 w-4" />
            Sign in with Google
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            By signing in you agree to our terms of service and privacy policy.
          </p>
        </div>
      </div>
    </div>
  )
}
