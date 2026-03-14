'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { Plus, Trash2, ExternalLink, Copy, MessageCircle, Linkedin, Smartphone, Mail, RefreshCw, Upload, X, GripVertical, Shield, AlertTriangle } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { ConfirmDelete } from '@/components/shared/confirm-delete'
import { PageHeader } from '@/components/shared/page-header'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { useWorkspaceSettings, useUpdateWorkspace, useUpdateWorkspaceSettings } from '@/lib/queries/workspaces'
import { useStages, useCreateStage, useUpdateStage, useDeleteStage, useReorderStages, useDeleteStageWithMigration, useStageApplicationCount } from '@/lib/queries/pipeline-stages'
import { DndContext, closestCenter, DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useTelegramLink, useGenerateTelegramCode, useUnlinkTelegram } from '@/lib/queries/telegram'
import { useLinkedInLink, useConnectLinkedIn, useUnlinkLinkedIn } from '@/lib/queries/linkedin'
import { useGmailLink, useConnectGmail, useUnlinkGmail, useToggleGmailSync, useSyncGmailNow } from '@/lib/queries/gmail'
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const wsForm = useForm({ defaultValues: { name: workspace.name } })
  const settingsForm = useForm({ defaultValues: settings ?? {} })

  useEffect(() => {
    if (settings) settingsForm.reset(settings)
  }, [settings])

  if (isLoading) return <Spinner />

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB')
      return
    }

    setUploading(true)
    try {
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const ext = file.name.split('.').pop() || 'png'
      const path = `${workspace.id}/logo.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('workspace-avatars')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('workspace-avatars')
        .getPublicUrl(path)

      const logoUrl = `${publicUrl}?v=${Date.now()}`
      await updateWorkspace.mutateAsync({ logo_url: logoUrl })
      toast.success('Logo updated')
    } catch {
      toast.error('Failed to upload logo')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveAvatar = async () => {
    try {
      await updateWorkspace.mutateAsync({ logo_url: null })
      toast.success('Logo removed')
    } catch {
      toast.error('Failed to remove logo')
    }
  }

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
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden">
                  {workspace.logo_url ? (
                    <img
                      src={workspace.logo_url}
                      alt={workspace.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-semibold text-muted-foreground">
                      {workspace.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {canEdit && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        <Upload className="mr-2 h-3.5 w-3.5" />
                        {uploading ? 'Uploading...' : 'Upload'}
                      </Button>
                      {workspace.logo_url && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveAvatar}
                          disabled={updateWorkspace.isPending}
                        >
                          <X className="mr-1 h-3.5 w-3.5" />
                          Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">PNG, JPG or SVG. Max 10MB.</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </div>
                )}
              </div>
            </div>
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

function SortableStageRow({
  stage,
  canEdit,
  onDelete,
  onUpdateColor,
}: {
  stage: PipelineStage
  canEdit: boolean
  onDelete: (id: string) => void
  onUpdateColor: (id: string, color: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stage.id,
    disabled: !canEdit || stage.is_protected,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-10">
        {canEdit && !stage.is_protected ? (
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground">
            <GripVertical className="h-4 w-4" />
          </button>
        ) : (
          <Shield className="h-4 w-4 text-blue-500 ml-1" />
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="font-medium">{stage.name}</span>
          {stage.is_protected && (
            <span className="text-[10px] font-medium uppercase tracking-wider text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
              System
            </span>
          )}
          {stage.is_terminal && (
            <span className="text-[10px] font-medium uppercase tracking-wider text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
              Terminal
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="w-20">
        <input
          type="color"
          value={stage.color}
          disabled={!canEdit}
          onChange={(e) => onUpdateColor(stage.id, e.target.value)}
          className="h-7 w-7 cursor-pointer rounded border border-border p-0.5 disabled:cursor-default"
        />
      </TableCell>
      {canEdit && (
        <TableCell className="w-12">
          {!stage.is_protected && (
            <Button variant="ghost" size="sm" onClick={() => onDelete(stage.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </TableCell>
      )}
    </TableRow>
  )
}

function StageDeleteDialog({
  stage,
  stages,
  open,
  onClose,
}: {
  stage: PipelineStage | null
  stages: PipelineStage[]
  open: boolean
  onClose: () => void
}) {
  const { data: appCount, isLoading: countLoading } = useStageApplicationCount(stage?.id ?? null)
  const deleteStage = useDeleteStage()
  const deleteWithMigration = useDeleteStageWithMigration()
  const [migrateToId, setMigrateToId] = useState<string>('')

  const hasApplications = (appCount ?? 0) > 0
  const otherStages = stages.filter((s) => s.id !== stage?.id)
  const isPending = deleteStage.isPending || deleteWithMigration.isPending

  const handleConfirm = async () => {
    if (!stage) return
    try {
      if (hasApplications) {
        if (!migrateToId) {
          toast.error('Please select a stage to move candidates to')
          return
        }
        await deleteWithMigration.mutateAsync({ stageId: stage.id, migrateToStageId: migrateToId })
      } else {
        await deleteStage.mutateAsync(stage.id)
      }
      toast.success('Stage removed')
      onClose()
    } catch {
      toast.error('Failed to remove stage')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove &ldquo;{stage?.name}&rdquo; stage?</DialogTitle>
          <DialogDescription>
            This will permanently remove this pipeline stage.
          </DialogDescription>
        </DialogHeader>

        {countLoading ? (
          <div className="flex items-center gap-2 py-4">
            <Spinner /> Checking for candidates...
          </div>
        ) : hasApplications ? (
          <div className="space-y-3 py-2">
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">
                  {appCount} candidate{appCount !== 1 ? 's' : ''} in this stage
                </p>
                <p className="text-amber-700 mt-1">
                  Choose a stage to move them to before deleting.
                </p>
              </div>
            </div>
            <Select value={migrateToId} onValueChange={setMigrateToId}>
              <SelectTrigger>
                <SelectValue placeholder="Move candidates to..." />
              </SelectTrigger>
              <SelectContent>
                {otherStages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-2">
            No candidates are in this stage. It can be safely removed.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending || countLoading || (hasApplications && !migrateToId)}
          >
            {isPending ? 'Removing...' : 'Remove Stage'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PipelineSettings() {
  const { role } = useWorkspace()
  const { data: stages, isLoading } = useStages()
  const createStage = useCreateStage()
  const updateStage = useUpdateStage()
  const reorderStages = useReorderStages()
  const [newStageName, setNewStageName] = useState('')
  const [deleteStage, setDeleteStage] = useState<PipelineStage | null>(null)
  const canEdit = CAN_ADMIN.includes(role)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  if (isLoading) return <Spinner />

  // Separate protected-first (Applied) and protected-last (Hired, Rejected) from draggable middle
  const appliedStage = stages?.find((s) => s.is_protected && s.name === 'Applied')
  const terminalProtected = stages?.filter((s) => s.is_protected && s.is_terminal) || []
  const draggableStages = stages?.filter(
    (s) => !s.is_protected
  ) || []

  const handleAddStage = async () => {
    if (!newStageName.trim()) return
    // Insert before terminal stages
    const terminalStart = terminalProtected.length > 0
      ? Math.min(...terminalProtected.map((s) => s.position))
      : (stages?.length ?? 0) + 1
    // Shift terminal stages up by 1
    const newPos = terminalStart
    try {
      // First bump terminal stages
      for (const ts of terminalProtected) {
        await updateStage.mutateAsync({ id: ts.id, position: ts.position + 1000 })
      }
      await createStage.mutateAsync({
        name: newStageName.trim(),
        position: newPos,
        color: '#6B7280',
        is_terminal: false,
      })
      // Re-assign terminal positions
      for (let i = 0; i < terminalProtected.length; i++) {
        await updateStage.mutateAsync({ id: terminalProtected[i].id, position: newPos + 1 + i })
      }
      setNewStageName('')
      toast.success('Stage added')
    } catch {
      toast.error('Failed to add stage')
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !stages) return

    const oldIndex = draggableStages.findIndex((s) => s.id === active.id)
    const newIndex = draggableStages.findIndex((s) => s.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    // Reorder the draggable stages
    const reordered = [...draggableStages]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)

    // Compute full ordering: Applied (1) + draggable (2..N-2) + terminals (N-1..N)
    const allOrdered: { id: string; position: number }[] = []
    let pos = 1
    if (appliedStage) {
      allOrdered.push({ id: appliedStage.id, position: pos++ })
    }
    for (const s of reordered) {
      allOrdered.push({ id: s.id, position: pos++ })
    }
    for (const s of terminalProtected) {
      allOrdered.push({ id: s.id, position: pos++ })
    }

    try {
      await reorderStages.mutateAsync(allOrdered)
      toast.success('Stages reordered')
    } catch {
      toast.error('Failed to reorder stages')
    }
  }

  const handleUpdateColor = (id: string, color: string) => {
    updateStage.mutate({ id, color })
  }

  return (
    <div className="space-y-6">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Name</TableHead>
              <TableHead className="w-20">Color</TableHead>
              {canEdit && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Applied stage — always first, not draggable */}
            {appliedStage && (
              <SortableStageRow
                key={appliedStage.id}
                stage={appliedStage}
                canEdit={canEdit}
                onDelete={() => {}}
                onUpdateColor={handleUpdateColor}
              />
            )}

            {/* Draggable middle stages */}
            <SortableContext items={draggableStages.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {draggableStages.map((stage) => (
                <SortableStageRow
                  key={stage.id}
                  stage={stage}
                  canEdit={canEdit}
                  onDelete={(id) => setDeleteStage(stages?.find((s) => s.id === id) ?? null)}
                  onUpdateColor={handleUpdateColor}
                />
              ))}
            </SortableContext>

            {/* Terminal protected stages — always last, not draggable */}
            {terminalProtected.map((stage) => (
              <SortableStageRow
                key={stage.id}
                stage={stage}
                canEdit={canEdit}
                onDelete={() => {}}
                onUpdateColor={handleUpdateColor}
              />
            ))}
          </TableBody>
        </Table>
      </DndContext>

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

      <p className="text-xs text-muted-foreground">
        <Shield className="inline h-3 w-3 mr-1 text-blue-500" />
        System stages (Applied, Hired, Rejected) cannot be deleted or reordered. Drag other stages to rearrange your pipeline.
      </p>

      <StageDeleteDialog
        stage={deleteStage}
        stages={stages || []}
        open={!!deleteStage}
        onClose={() => setDeleteStage(null)}
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

function JobBoardSettings() {
  const { workspace, role } = useWorkspace()
  const { data: settings, isLoading } = useWorkspaceSettings()
  const updateSettings = useUpdateWorkspaceSettings()
  const canEdit = CAN_ADMIN.includes(role)
  const [copied, setCopied] = useState(false)

  const [boardEnabled, setBoardEnabled] = useState(false)
  const [careersTitle, setCareersTitle] = useState('')
  const [careersDescription, setCareersDescription] = useState('')

  useEffect(() => {
    if (settings) {
      setBoardEnabled(settings.public_board_enabled ?? false)
      setCareersTitle(settings.careers_page_title ?? '')
      setCareersDescription(settings.careers_page_description ?? '')
    }
  }, [settings])

  if (isLoading) return <Spinner />

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/jobs/${workspace.slug}`

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        public_board_enabled: boardEnabled,
        careers_page_title: careersTitle || null,
        careers_page_description: careersDescription || null,
      })
      toast.success('Job board settings saved')
    } catch { toast.error('Failed to save') }
  }

  const copyUrl = () => {
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-[600px]">
      <Card>
        <CardHeader>
          <CardTitle>Public Job Board</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Public Job Board</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Allow anyone to view your open positions and apply
              </p>
            </div>
            <Switch
              checked={boardEnabled}
              onCheckedChange={setBoardEnabled}
              disabled={!canEdit}
            />
          </div>

          {boardEnabled && (
            <>
              <div className="space-y-2">
                <Label>Public URL</Label>
                <div className="flex items-center gap-2">
                  <Input value={publicUrl} readOnly className="text-xs" />
                  <Button variant="outline" size="sm" onClick={copyUrl}>
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Careers Page Title</Label>
                <Input
                  value={careersTitle}
                  onChange={(e) => setCareersTitle(e.target.value)}
                  placeholder={`Join ${workspace.name}`}
                  disabled={!canEdit}
                />
              </div>

              <div className="space-y-2">
                <Label>Careers Page Description</Label>
                <Textarea
                  value={careersDescription}
                  onChange={(e) => setCareersDescription(e.target.value)}
                  placeholder="We're on a mission to..."
                  rows={3}
                  disabled={!canEdit}
                />
              </div>
            </>
          )}

          {canEdit && (
            <Button onClick={handleSave} disabled={updateSettings.isPending}>
              {updateSettings.isPending ? 'Saving...' : 'Save'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function IntegrationSettings() {
  const { role } = useWorkspace()
  const { data: link, isLoading } = useTelegramLink()
  const generateCode = useGenerateTelegramCode()
  const unlinkTelegram = useUnlinkTelegram()
  const { data: linkedinLink, isLoading: linkedinLoading } = useLinkedInLink()
  const connectLinkedIn = useConnectLinkedIn()
  const unlinkLinkedIn = useUnlinkLinkedIn()
  const { data: gmailLink, isLoading: gmailLoading } = useGmailLink()
  const connectGmail = useConnectGmail()
  const unlinkGmail = useUnlinkGmail()
  const toggleGmailSync = useToggleGmailSync()
  const syncGmailNow = useSyncGmailNow()
  const [codeData, setCodeData] = useState<{ code: string; expires_at: string } | null>(null)
  const [codeCopied, setCodeCopied] = useState(false)
  const canEdit = CAN_ADMIN.includes(role)

  if (isLoading || linkedinLoading || gmailLoading) return <Spinner />

  const handleGenerateCode = async () => {
    try {
      const data = await generateCode.mutateAsync()
      setCodeData(data)
    } catch {
      toast.error('Failed to generate code')
    }
  }

  const handleCopyCode = () => {
    if (!codeData) return
    navigator.clipboard.writeText(codeData.code)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  const handleUnlink = async () => {
    try {
      await unlinkTelegram.mutateAsync()
      setCodeData(null)
      toast.success('Telegram unlinked')
    } catch {
      toast.error('Failed to unlink')
    }
  }

  return (
    <div className="space-y-6 max-w-[600px]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Telegram Bot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {link ? (
            <div className="space-y-4">
              <div className="rounded-md border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-medium text-green-800">Telegram connected</p>
                {link.telegram_username && (
                  <p className="text-xs text-green-700 mt-0.5">@{link.telegram_username}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Linked {new Date(link.linked_at).toLocaleDateString()}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Send a job description to <strong>@BaelRecruitBot</strong> on Telegram to create a draft.
                Reply to adjust it.
              </p>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnlink}
                  disabled={unlinkTelegram.isPending}
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  {unlinkTelegram.isPending ? 'Unlinking...' : 'Unlink Telegram'}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Link your Telegram account to create and update job posts by messaging{' '}
                <strong>@BaelRecruitBot</strong>.
              </p>
              {!codeData ? (
                <>
                  <ol className="space-y-1.5 text-sm text-muted-foreground list-decimal list-inside">
                    <li>Click <strong>Generate Code</strong> below</li>
                    <li>Scan the QR code or open <strong>@BaelRecruitBot</strong> on Telegram</li>
                    <li>The bot will link automatically</li>
                  </ol>
                  {canEdit && (
                    <Button onClick={handleGenerateCode} disabled={generateCode.isPending}>
                      {generateCode.isPending ? 'Generating...' : 'Generate Code'}
                    </Button>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-5">
                    <a
                      href={`https://t.me/BaelRecruitBot?start=${codeData.code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 rounded-lg border border-border bg-white p-2 hover:shadow-md transition-shadow"
                    >
                      <QRCodeSVG
                        value={`https://t.me/BaelRecruitBot?start=${codeData.code}`}
                        size={120}
                        level="M"
                      />
                    </a>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-1">Scan with your phone</p>
                        <p className="text-xs text-muted-foreground">
                          Opens the bot and sends your code automatically
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">or enter manually:</span>
                        <div className="rounded-md border border-border bg-muted px-3 py-1 font-mono text-lg tracking-[0.3em] font-bold select-all">
                          {codeData.code}
                        </div>
                        <Button variant="outline" size="sm" onClick={handleCopyCode}>
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          {codeCopied ? 'Copied' : 'Copy'}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Expires {new Date(codeData.expires_at).toLocaleTimeString()}.{' '}
                    <button className="underline hover:no-underline" onClick={handleGenerateCode}>
                      Generate new code
                    </button>
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Linkedin className="h-5 w-5" />
            LinkedIn
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {linkedinLink ? (
            <div className="space-y-4">
              <div className="rounded-md border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-medium text-green-800">LinkedIn connected</p>
                {linkedinLink.linkedin_name && (
                  <p className="text-xs text-green-700 mt-0.5">{linkedinLink.linkedin_name}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Linked {new Date(linkedinLink.linked_at).toLocaleDateString()}
                </p>
                {new Date(linkedinLink.token_expires_at) < new Date() && (
                  <p className="text-xs text-amber-600 mt-1 font-medium">
                    Token expired — please reconnect
                  </p>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Share open job posts directly to your LinkedIn profile.
              </p>
              {canEdit && (
                <div className="flex gap-2">
                  {new Date(linkedinLink.token_expires_at) < new Date() && (
                    <Button
                      size="sm"
                      onClick={() => connectLinkedIn.mutate()}
                      disabled={connectLinkedIn.isPending}
                    >
                      Reconnect
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      unlinkLinkedIn.mutate(undefined, {
                        onSuccess: () => toast.success('LinkedIn disconnected'),
                        onError: () => toast.error('Failed to disconnect'),
                      })
                    }}
                    disabled={unlinkLinkedIn.isPending}
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    {unlinkLinkedIn.isPending ? 'Disconnecting...' : 'Disconnect LinkedIn'}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your LinkedIn account to share job posts to your professional network.
              </p>
              {canEdit && (
                <Button
                  onClick={() => connectLinkedIn.mutate()}
                  disabled={connectLinkedIn.isPending}
                >
                  <Linkedin className="mr-2 h-4 w-4" />
                  {connectLinkedIn.isPending ? 'Connecting...' : 'Connect LinkedIn'}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Gmail Inbox
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {gmailLink ? (
            <div className="space-y-4">
              <div className="rounded-md border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-medium text-green-800">Gmail connected</p>
                <p className="text-xs text-green-700 mt-0.5">{gmailLink.gmail_address}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Linked {new Date(gmailLink.linked_at).toLocaleDateString()}
                  {gmailLink.last_synced_at && (
                    <> &middot; Last synced {new Date(gmailLink.last_synced_at).toLocaleString()}</>
                  )}
                </p>
              </div>

              {gmailLink.last_error && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-medium text-amber-800">Sync error</p>
                  <p className="text-xs text-amber-700 mt-0.5">{gmailLink.last_error}</p>
                  {canEdit && (
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={() => connectGmail.mutate()}
                      disabled={connectGmail.isPending}
                    >
                      Reconnect
                    </Button>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Auto-sync</p>
                  <p className="text-xs text-muted-foreground">
                    Automatically ingest CVs from incoming emails
                  </p>
                </div>
                <Switch
                  checked={gmailLink.sync_enabled}
                  disabled={!canEdit || toggleGmailSync.isPending}
                  onCheckedChange={(checked) =>
                    toggleGmailSync.mutate({ linkId: gmailLink.id, enabled: checked })
                  }
                />
              </div>

              <p className="text-sm text-muted-foreground">
                Emails with PDF attachments are parsed automatically. Candidates are matched to open jobs and added to the pipeline.
              </p>

              {canEdit && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      syncGmailNow.mutate(undefined, {
                        onSuccess: (data) => {
                          if (data.processed > 0) {
                            toast.success(`Synced ${data.processed} email${data.processed > 1 ? 's' : ''}`)
                          } else {
                            toast.info('No new emails to process')
                          }
                        },
                        onError: () => toast.error('Failed to sync emails'),
                      })
                    }}
                    disabled={syncGmailNow.isPending || !gmailLink.sync_enabled}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${syncGmailNow.isPending ? 'animate-spin' : ''}`} />
                    {syncGmailNow.isPending ? 'Syncing...' : 'Sync Now'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      unlinkGmail.mutate(undefined, {
                        onSuccess: () => toast.success('Gmail disconnected'),
                        onError: () => toast.error('Failed to disconnect'),
                      })
                    }}
                    disabled={unlinkGmail.isPending}
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    {unlinkGmail.isPending ? 'Disconnecting...' : 'Disconnect Gmail'}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your Gmail inbox to automatically ingest candidate CVs from incoming emails. When someone sends a resume to your inbox, the system parses it and adds the candidate to the right job pipeline.
              </p>
              {canEdit && (
                <Button
                  onClick={() => connectGmail.mutate()}
                  disabled={connectGmail.isPending}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {connectGmail.isPending ? 'Connecting...' : 'Connect Gmail'}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
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
          <TabsTrigger value="job-board">Job Board</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <GeneralSettings />
        </TabsContent>
        <TabsContent value="pipeline">
          <PipelineSettings />
        </TabsContent>
        <TabsContent value="job-board">
          <JobBoardSettings />
        </TabsContent>
        <TabsContent value="features">
          <FeatureSettings />
        </TabsContent>
        <TabsContent value="integrations">
          <IntegrationSettings />
        </TabsContent>
      </Tabs>
    </>
  )
}
