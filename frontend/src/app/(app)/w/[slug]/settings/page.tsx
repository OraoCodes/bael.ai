'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { Plus, Trash2, ExternalLink, Copy, MessageCircle, Linkedin, Smartphone } from 'lucide-react'
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
import { useStages, useCreateStage, useUpdateStage, useDeleteStage } from '@/lib/queries/pipeline-stages'
import { useTelegramLink, useGenerateTelegramCode, useUnlinkTelegram } from '@/lib/queries/telegram'
import { useLinkedInLink, useConnectLinkedIn, useUnlinkLinkedIn } from '@/lib/queries/linkedin'
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
  const [codeData, setCodeData] = useState<{ code: string; expires_at: string } | null>(null)
  const [codeCopied, setCodeCopied] = useState(false)
  const canEdit = CAN_ADMIN.includes(role)

  if (isLoading || linkedinLoading) return <Spinner />

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
