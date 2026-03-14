import { ImageResponse } from 'next/og'
import { fetchPublicJob } from '@/lib/queries/public-jobs'

export const runtime = 'edge'

export async function GET(_req: Request, { params }: { params: Promise<{ workspaceSlug: string; jobSlug: string }> }) {
  const { workspaceSlug, jobSlug } = await params
  const data = await fetchPublicJob(workspaceSlug, jobSlug)

  const jobTitle = data?.job.title ?? 'Open Position'
  const companyName = data?.workspace.name ?? 'Company'
  const logoUrl = data?.workspace.logo_url ?? null
  const location = data?.job.location
  const type = data?.job.employment_type?.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
  const skills = data?.job.skills?.slice(0, 5) ?? []

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

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '48px 60px',
            maxWidth: '1000px',
          }}
        >
          {/* "We're hiring" badge */}
          <div
            style={{
              padding: '8px 24px',
              borderRadius: '999px',
              background: '#dcfce7',
              border: '1px solid #86efac',
              fontSize: '15px',
              fontWeight: 600,
              color: '#16a34a',
              display: 'flex',
              letterSpacing: '0.02em',
            }}
          >
            We&apos;re hiring
          </div>

          {/* Job title */}
          <div
            style={{
              marginTop: '24px',
              fontSize: '52px',
              fontWeight: 800,
              color: '#18181b',
              textAlign: 'center',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              display: 'flex',
            }}
          >
            {jobTitle}
          </div>

          {/* Company name + logo */}
          <div
            style={{
              marginTop: '14px',
              fontSize: '24px',
              color: '#71717a',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            at
            {logoUrl && (
              <img
                src={logoUrl}
                alt={companyName}
                width={28}
                height={28}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  objectFit: 'cover',
                  border: '1px solid #e4e4e7',
                }}
              />
            )}
            {companyName}
          </div>

          {/* Meta: location + type */}
          {(location || type) && (
            <div
              style={{
                marginTop: '24px',
                display: 'flex',
                gap: '16px',
              }}
            >
              {location && (
                <div
                  style={{
                    padding: '8px 20px',
                    borderRadius: '999px',
                    background: 'white',
                    border: '1px solid #e4e4e7',
                    fontSize: '16px',
                    fontWeight: 500,
                    color: '#52525b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  📍 {location}
                </div>
              )}
              {type && (
                <div
                  style={{
                    padding: '8px 20px',
                    borderRadius: '999px',
                    background: 'white',
                    border: '1px solid #e4e4e7',
                    fontSize: '16px',
                    fontWeight: 500,
                    color: '#52525b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {type}
                </div>
              )}
            </div>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <div
              style={{
                marginTop: '20px',
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              {skills.map((skill: string) => (
                <div
                  key={skill}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '999px',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#2563eb',
                    display: 'flex',
                  }}
                >
                  {skill}
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <div
            style={{
              marginTop: '36px',
              padding: '14px 40px',
              borderRadius: '16px',
              background: '#18181b',
              fontSize: '18px',
              fontWeight: 600,
              color: 'white',
              display: 'flex',
              letterSpacing: '0.01em',
            }}
          >
            Apply Now →
          </div>
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
