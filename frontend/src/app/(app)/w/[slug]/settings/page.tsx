'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Spinner } from '@/components/ui/spinner'
import { ConfirmDelete } from '@/components/shared/confirm-delete'
import { PageHeader } from '@/components/shared/page-header'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { useWorkspaceSettings, useUpdateWorkspace, useUpdateWorkspaceSettings } from '@/lib/queries/workspaces'
import { useStages, useCreateStage, useUpdateStage, useDeleteStage } from '@/lib/queries/pipeline-stages'
import { CAN_ADMIN } from '@/lib/utils/constants'
import type { PipelineStage } from '@/lib/types/database'

const COMPANY_SIZES = [
  '1-10', '11-50', '51-200', '201-1000', '1000+'
].map((v) => ({ label: v, value: v }))

const INDUSTRIES = [
  'Technology', 'Finance', 'Healthcare', 'Education', 'Retail', 'Manufacturing', 'Consulting', 'Other'
].map((v) => ({ label: v, value: v.toLowerCase() }))

const HIRING_VOLUMES = [
  { label: '1-5/month', value: '1-5' },
  { label: '6-20/month', value: '6-20' },
  { label: '21-50/month', value: '21-50' },
  { label: '50+/month', value: '50+' },
]

function GeneralSettings() {
  const { workspace, role } = useWorkspace()
  const { data: settings, isLoading } = useWorkspaceSettings()
  const updateWorkspace = useUpdateWorkspace()
  const updateSettings = useUpdateWorkspaceSettings()
  const canEdit = CAN_ADMIN.includes(role)

  const wsForm = useForm({ defaultValues: { name: workspace.name } })
  const settingsForm = useForm({ defaultValues: settings ?? {} })

  if (isLoading) return <Spinner />

  const handleWorkspaceSave = async (values: { name: string }) => {
    try {
      await updateWorkspace.mutateAsync(values)
      toast.success('Saved')
    } catch { toast.error('Failed to save') }
  }

  const handleSettingsSave = async (values: unknown) => {
    try {
      await updateSettings.mutateAsync(values as Record<string, unknown>)
      toast.success('Saved')
    } catch { toast.error('Failed to save') }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={wsForm.handleSubmit(handleWorkspaceSave)} className="max-w-[400px] space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...wsForm.register('name', { required: true })} disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={workspace.slug} disabled />
            </div>
            {canEdit && (
              <Button type="submit" disabled={updateWorkspace.isPending}>
                {updateWorkspace.isPending ? 'Saving...' : 'Save'}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Company Info</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={settingsForm.handleSubmit(handleSettingsSave)} className="max-w-[500px] space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label>Company Size</Label>
                <Controller name="company_size" control={settingsForm.control} render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value as string} disabled={!canEdit}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_SIZES.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="flex-1 space-y-2">
                <Label>Industry</Label>
                <Controller name="industry" control={settingsForm.control} render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value as string} disabled={!canEdit}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label>Hiring Volume</Label>
                <Controller name="hiring_volume" control={settingsForm.control} render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value as string} disabled={!canEdit}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {HIRING_VOLUMES.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="flex-1 space-y-2">
                <Label>Timezone</Label>
                <Input {...settingsForm.register('timezone')} disabled={!canEdit} placeholder="UTC" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Default Currency</Label>
              <Controller name="default_currency" control={settingsForm.control} render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value as string} disabled={!canEdit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (&euro;)</SelectItem>
                    <SelectItem value="GBP">GBP (&pound;)</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
            {canEdit && (
              <Button type="submit" disabled={updateSettings.isPending}>
                {updateSettings.isPending ? 'Saving...' : 'Save'}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function PipelineSettings() {
  const { role } = useWorkspace()
  const { data: stages, isLoading } = useStages()
  const createStage = useCreateStage()
  const updateStage = useUpdateStage()
  const deleteStage = useDeleteStage()
  const [newStageName, setNewStageName] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const canEdit = CAN_ADMIN.includes(role)

  if (isLoading) return <Spinner />

  const handleAddStage = async () => {
    if (!newStageName.trim()) return
    const maxPos = Math.max(...(stages || []).map((s) => s.position), 0)
    try {
      await createStage.mutateAsync({
        name: newStageName.trim(),
        position: maxPos + 1,
        color: '#6B7280',
        is_terminal: false,
      })
      setNewStageName('')
      toast.success('Stage added')
    } catch { toast.error('Failed to add stage') }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteStage.mutateAsync(id)
      toast.success('Stage removed')
    } catch { toast.error('Failed to remove stage') }
  }

  return (
    <div className="space-y-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="w-20">Position</TableHead>
            <TableHead className="w-20">Color</TableHead>
            <TableHead className="w-20">Terminal</TableHead>
            {canEdit && <TableHead className="w-15" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {stages?.map((stage: PipelineStage) => (
            <TableRow key={stage.id}>
              <TableCell>{stage.name}</TableCell>
              <TableCell>{stage.position}</TableCell>
              <TableCell>
                <div
                  className="h-5 w-5 rounded border border-border"
                  style={{ background: stage.color }}
                />
              </TableCell>
              <TableCell>
                <Switch
                  checked={stage.is_terminal}
                  disabled={!canEdit}
                  onCheckedChange={(checked) => updateStage.mutate({ id: stage.id, is_terminal: checked })}
                />
              </TableCell>
              {canEdit && (
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(stage.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {canEdit && (
        <div className="flex items-center gap-2">
          <Input
            placeholder="New stage name"
            value={newStageName}
            onChange={(e) => setNewStageName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddStage()}
            className="w-[200px]"
          />
          <Button onClick={handleAddStage} disabled={createStage.isPending}>
            <Plus className="mr-2 h-4 w-4" />
            {createStage.isPending ? 'Adding...' : 'Add Stage'}
          </Button>
        </div>
      )}

      <ConfirmDelete
        title="Remove this stage?"
        description="This action cannot be undone."
        open={!!deleteId}
        loading={deleteStage.isPending}
        onConfirm={() => { if (deleteId) handleDelete(deleteId).then(() => setDeleteId(null)) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}

function FeatureSettings() {
  const { role } = useWorkspace()
  const { data: settings, isLoading } = useWorkspaceSettings()
  const updateSettings = useUpdateWorkspaceSettings()
  const canEdit = CAN_ADMIN.includes(role)

  if (isLoading) return <Spinner />

  const features = (settings?.features || {}) as Record<string, unknown>

  const handleStagnationChange = async (days: number | null) => {
    try {
      await updateSettings.mutateAsync({
        features: { ...features, stagnation_threshold_days: days },
      })
      toast.success('Saved')
    } catch { toast.error('Failed to save') }
  }

  return (
    <Card className="max-w-[500px]">
      <CardHeader>
        <CardTitle>Stagnation Detection</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label>Stagnation Threshold (days)</Label>
          <Input
            type="number"
            value={(features.stagnation_threshold_days as number) ?? 7}
            min={1}
            max={90}
            disabled={!canEdit}
            onChange={(e) => handleStagnationChange(Number(e.target.value) || null)}
            className="w-30"
          />
          <p className="text-xs text-muted-foreground">
            Candidates in a non-terminal stage longer than this will generate a stagnation alert.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <Tabs defaultValue="general">
        <TabsList variant="line">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline Stages</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <GeneralSettings />
        </TabsContent>
        <TabsContent value="pipeline">
          <PipelineSettings />
        </TabsContent>
        <TabsContent value="features">
          <FeatureSettings />
        </TabsContent>
      </Tabs>
    </>
  )
}
