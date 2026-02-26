'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/components/providers/workspace-provider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function WorkspaceSwitcher() {
  const router = useRouter()
  const { workspace } = useWorkspace()
  const supabase = createClient()

  const { data: workspaces } = useQuery({
    queryKey: ['my-workspaces'],
    queryFn: async () => {
      const { data } = await supabase
        .from('workspace_memberships')
        .select('workspace_id, workspaces(id, name, slug)')
      const result: { id: string; name: string; slug: string }[] = []
      for (const m of data || []) {
        const ws = m.workspaces
        if (ws && !Array.isArray(ws) && 'id' in ws) {
          result.push(ws as { id: string; name: string; slug: string })
        }
      }
      return result
    },
  })

  return (
    <Select
      value={workspace.id}
      onValueChange={(value) => {
        const ws = workspaces?.find((w) => w.id === value)
        if (ws) router.push(`/w/${ws.slug}`)
      }}
    >
      <SelectTrigger className="w-[200px] h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(workspaces || []).map((w) => (
          <SelectItem key={w.id} value={w.id}>
            {w.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
