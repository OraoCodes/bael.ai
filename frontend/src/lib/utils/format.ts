import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export function formatDate(date: string): string {
  return dayjs(date).format('MMM D, YYYY')
}

export function formatDateTime(date: string): string {
  return dayjs(date).format('MMM D, YYYY h:mm A')
}

export function formatRelative(date: string): string {
  return dayjs(date).fromNow()
}

export function formatFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim()
}

export function formatSalary(min: number | null, max: number | null, currency: string): string {
  if (!min && !max) return '-'
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
  if (min && max) return `${fmt(min)} - ${fmt(max)}`
  if (min) return `From ${fmt(min)}`
  return `Up to ${fmt(max!)}`
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(p => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

export const ACTIVITY_ACTION_LABELS: Record<string, string> = {
  created: 'created',
  updated: 'updated',
  deleted: 'deleted',
  stage_changed: 'moved to a new stage',
  ai_match_scored: 'ran AI matching on',
  invited: 'invited',
  revoked: 'revoked invitation for',
  applied: 'applied for',
}

export function getActivityLabel(action: string): string {
  return ACTIVITY_ACTION_LABELS[action] || action
}
