import { ImageResponse } from 'next/og'
import { fetchWorkspaceBySlug, fetchPublicJobs } from '@/lib/queries/public-jobs'

export const runtime = 'edge'

export async function GET(_req: Request, { params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params
  const data = await fetchWorkspaceBySlug(workspaceSlug)
  const jobs = await fetchPublicJobs(workspaceSlug)

  const name = data?.workspace.name ?? 'Careers'
  const logoUrl = data?.workspace.logo_url ?? null
  const title = data?.boardConfig.careers_page_title || `Join ${name}`
  const jobCount = jobs.length
  const departments = [...new Set(jobs.map((j) => j.department).filter(Boolean))].slice(0, 4) as string[]
  const topJobs = jobs.slice(0, 3)

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200',
          height: '630',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            right: '-80px',
            width: '320px',
            height: '320px',
            borderRadius: '50%',
            background: 'rgba(59, 130, 246, 0.08)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-100px',
            left: '-60px',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: 'rgba(59, 130, 246, 0.06)',
            display: 'flex',
          }}
        />

        {/* Content card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '48px 60px',
            maxWidth: '1000px',
          }}
        >
          {/* Company logo / fallback initial */}
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={name}
              width={72}
              height={72}
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '20px',
                objectFit: 'cover',
                border: '1px solid #e4e4e7',
              }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '72px',
                height: '72px',
                borderRadius: '20px',
                background: '#18181b',
                color: 'white',
                fontSize: '32px',
                fontWeight: 700,
              }}
            >
              {name[0]}
            </div>
          )}

          {/* Title */}
          <div
            style={{
              marginTop: '28px',
              fontSize: '48px',
              fontWeight: 800,
              color: '#18181b',
              textAlign: 'center',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              display: 'flex',
            }}
          >
            {title}
          </div>

          {/* Job count */}
          <div
            style={{
              marginTop: '16px',
              fontSize: '22px',
              color: '#3b82f6',
              fontWeight: 600,
              display: 'flex',
            }}
          >
            {jobCount} open position{jobCount !== 1 ? 's' : ''}
          </div>

          {/* Top job titles */}
          {topJobs.length > 0 && (
            <div
              style={{
                marginTop: '32px',
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              {topJobs.map((job) => (
                <div
                  key={job.id}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '999px',
                    background: 'white',
                    border: '1px solid #e4e4e7',
                    fontSize: '16px',
                    fontWeight: 500,
                    color: '#3f3f46',
                    display: 'flex',
                  }}
                >
                  {job.title}
                </div>
              ))}
              {jobCount > 3 && (
                <div
                  style={{
                    padding: '10px 20px',
                    borderRadius: '999px',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    fontSize: '16px',
                    fontWeight: 500,
                    color: '#2563eb',
                    display: 'flex',
                  }}
                >
                  +{jobCount - 3} more
                </div>
              )}
            </div>
          )}

          {/* Departments */}
          {departments.length > 0 && (
            <div
              style={{
                marginTop: '20px',
                fontSize: '15px',
                color: '#a1a1aa',
                display: 'flex',
              }}
            >
              {departments.join('  ·  ')}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            height: '52px',
            background: '#18181b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: '14px', color: '#a1a1aa', display: 'flex' }}>
            Powered by
          </div>
          <div style={{ fontSize: '14px', color: 'white', fontWeight: 600, display: 'flex' }}>
            bael.ai
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
