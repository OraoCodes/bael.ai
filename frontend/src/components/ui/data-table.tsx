'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DataTableColumn<T> {
  key: string
  title: string
  width?: string | number
  render?: (value: any, record: T, index: number) => React.ReactNode
  dataIndex?: string
}

export interface DataTablePagination {
  current: number
  pageSize: number
  total: number
  onChange: (page: number, pageSize: number) => void
  showSizeChanger?: boolean
}

interface DataTableProps<T extends Record<string, any>> {
  columns: DataTableColumn<T>[]
  dataSource: T[]
  rowKey: string | ((record: T) => string)
  loading?: boolean
  pagination?: DataTablePagination | false
  className?: string
  emptyText?: string
}

function getRowKey<T extends Record<string, any>>(
  record: T,
  rowKey: string | ((record: T) => string)
): string {
  return typeof rowKey === 'function' ? rowKey(record) : String(record[rowKey])
}

function getCellValue<T extends Record<string, any>>(
  record: T,
  col: DataTableColumn<T>
): unknown {
  if (col.dataIndex) return record[col.dataIndex]
  return record[col.key]
}

const PAGE_SIZE_OPTIONS = ['10', '20', '50']

export function DataTable<T extends Record<string, any>>({
  columns,
  dataSource,
  rowKey,
  loading = false,
  pagination,
  className,
  emptyText = 'No data',
}: DataTableProps<T>) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} style={col.width ? { width: col.width } : undefined}>
                  {col.title}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : dataSource.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                    <Inbox className="h-8 w-8" />
                    <span className="text-sm">{emptyText}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              dataSource.map((record, index) => (
                <TableRow key={getRowKey(record, rowKey)}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      {col.render
                        ? col.render(getCellValue(record, col), record, index)
                        : String(getCellValue(record, col) ?? '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.total > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-muted-foreground">
            {(() => {
              const start = (pagination.current - 1) * pagination.pageSize + 1
              const end = Math.min(pagination.current * pagination.pageSize, pagination.total)
              return `Showing ${start}–${end} of ${pagination.total}`
            })()}
          </p>
          <div className="flex items-center gap-2">
            {pagination.showSizeChanger !== false && (
              <Select
                value={String(pagination.pageSize)}
                onValueChange={(val) => pagination.onChange(1, Number(val))}
              >
                <SelectTrigger className="h-8 w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s} / page</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={pagination.current <= 1}
              onClick={() => pagination.onChange(pagination.current - 1, pagination.pageSize)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={pagination.current * pagination.pageSize >= pagination.total}
              onClick={() => pagination.onChange(pagination.current + 1, pagination.pageSize)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
