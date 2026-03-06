'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { useAuth } from '@/components/providers/auth-provider'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import {
  LayoutDashboard,
  User,
  FileText,
  Users,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Check,
  Building2,
  Bell,
  LogOut,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', suffix: '' },
  { icon: User, label: 'Candidates', suffix: '/candidates' },
  { icon: FileText, label: 'Jobs', suffix: '/jobs' },
  { icon: Users, label: 'Team', suffix: '/team' },
  { icon: History, label: 'Activity', suffix: '/activity' },
]

export function AppSider() {
  const pathname = usePathname()
  const router = useRouter()
  const { workspace } = useWorkspace()
  const { user, signOut } = useAuth()
  const supabase = createClient()
  const [collapsed, setCollapsed] = useState(false)
  const base = `/w/${workspace.slug}`

  const name = user?.user_metadata?.full_name || user?.email || ''
  const avatarUrl = user?.user_metadata?.avatar_url

  const { data: workspaces } = useQuery({
    queryKey: ['my-workspaces'],
    queryFn: async () => {
      const { data: { user: me } } = await supabase.auth.getUser()
      const { data } = await supabase
        .from('workspace_memberships')
        .select('workspace_id, workspaces!inner(id, name, slug, deleted_at)')
        .eq('user_id', me!.id)
        .is('workspaces.deleted_at', null)
      const seen = new Set<string>()
      const result: { id: string; name: string; slug: string }[] = []
      for (const m of (data || []) as unknown as Array<{ workspaces: { id: string; name: string; slug: string } }>) {
        const ws = m.workspaces
        if (ws && !seen.has(ws.id)) {
          seen.add(ws.id)
          result.push(ws)
        }
      }
      return result
    },
  })

  const hasMultiple = (workspaces?.length ?? 0) > 1

  const profileLinks = [
    {
      icon: Bell,
      label: 'Notifications',
      href: `${base}/activity`,
      badge: null,
    },
    {
      icon: Settings,
      label: 'Settings',
      href: `${base}/settings`,
      badge: null,
    },
  ]

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-border bg-background transition-all duration-200 flex-shrink-0',
        collapsed ? 'w-[60px]' : 'w-[220px]'
      )}
    >
      {/* Logo */}
      <div className="flex h-12 items-center border-b border-border px-4 font-bold text-primary">
        {collapsed ? (
          <span className="text-base">b.</span>
        ) : (
          <span className="text-xl">bael.ai</span>
        )}
      </div>

      {/* Workspace switcher */}
      <div className="border-b border-border px-3 py-3">
        {collapsed ? (
          <div className="flex justify-center">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
          </div>
        ) : (
          <>
            <p className="mb-1.5 px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              My Workspace
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium transition-colors hover:bg-muted',
                    !hasMultiple && 'cursor-default hover:bg-transparent'
                  )}
                  disabled={!hasMultiple}
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary text-[11px] font-bold text-primary-foreground">
                    {workspace.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 truncate">{workspace.name}</span>
                  {hasMultiple && (
                    <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px]">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Switch workspace
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(workspaces || []).map((w) => (
                  <DropdownMenuItem
                    key={w.id}
                    onSelect={() => router.push(`/w/${w.slug}`)}
                    className="flex items-center gap-2"
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
                      {w.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="flex-1 truncate">{w.name}</span>
                    {w.id === workspace.id && <Check className="h-3.5 w-3.5 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 py-3 overflow-hidden">
        {NAV_ITEMS.map(({ icon: Icon, label, suffix }) => {
          const href = `${base}${suffix}`
          const isActive = suffix === ''
            ? pathname === base || pathname === `${base}/`
            : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 mx-2 px-2 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Profile section + User card — links revealed on hover */}
      <div className="group">
        {/* Profile links: hidden by default, slide in on hover */}
        <div className="overflow-hidden max-h-0 group-hover:max-h-[300px] transition-all duration-200 ease-in-out">
          <div className="border-t border-border pt-3 pb-1">
            {!collapsed && (
              <p className="mb-1 px-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Profile
              </p>
            )}
            {profileLinks.map(({ icon: Icon, label, href, badge }) => {
              const isActive = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 mx-2 px-2 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1">{label}</span>
                      {badge !== null && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-medium text-primary-foreground">
                          {badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              )
            })}
            <button
              onClick={signOut}
              className="flex w-full items-center gap-3 mx-2 px-2 py-2 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              style={{ width: 'calc(100% - 16px)' }}
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>Log out</span>}
            </button>
          </div>
        </div>

        {/* User card — always visible */}
        <div className="border-t border-border px-3 py-3">
          {collapsed ? (
            <div className="flex justify-center">
              <Avatar className="h-7 w-7">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={name} referrerPolicy="no-referrer" />}
                <AvatarFallback className="text-[10px]">{getInitials(name)}</AvatarFallback>
              </Avatar>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
              <Avatar className="h-7 w-7 shrink-0">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={name} referrerPolicy="no-referrer" />}
                <AvatarFallback className="text-[10px]">{getInitials(name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex h-10 items-center justify-center border-t border-border text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  )
}
