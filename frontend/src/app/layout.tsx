import type { Metadata } from 'next'
import { QueryProvider } from '@/components/providers/query-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'bael.ai - Recruitment CRM',
  description: 'Multi-tenant recruitment CRM powered by AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <TooltipProvider>
            {children}
            <Toaster richColors position="top-right" />
          </TooltipProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
