import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
import { fetchWorkspaceBySlug } from '@/lib/queries/public-jobs'

const POLICY_VERSION = '1.0'

interface Props {
  params: Promise<{ workspaceSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspaceSlug } = await params
  const data = await fetchWorkspaceBySlug(workspaceSlug)
  if (!data) return { title: 'Data Protection Notice' }

  return {
    title: `Data Protection Notice — ${data.workspace.name}`,
    description: `How ${data.workspace.name} handles your personal data when you apply for a job.`,
  }
}

export default async function DataProtectionPage({ params }: Props) {
  const { workspaceSlug } = await params
  const data = await fetchWorkspaceBySlug(workspaceSlug)
  if (!data) notFound()

  const { workspace } = data

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-12 sm:px-6 lg:px-8">
      <a
        href={`/jobs/${workspaceSlug}`}
        className="mb-6 sm:mb-8 inline-flex items-center gap-1.5 text-xs sm:text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        Back to {workspace.name} careers
      </a>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-8 md:p-10">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
          Data Protection Notice
        </h1>
        <p className="mt-1 text-[11px] text-zinc-400">
          Version {POLICY_VERSION} — Last updated March 2026
        </p>

        <div className="mt-6 sm:mt-8 space-y-6 text-[13px] sm:text-sm text-zinc-600 leading-relaxed">
          {/* 1 — Introduction */}
          <section>
            <h2 className="text-sm sm:text-base font-semibold text-zinc-900 mb-2">
              1. Introduction
            </h2>
            <p>
              This Data Protection Notice explains how your personal data is collected, used,
              and protected when you submit a job application through this careers page.
              It is issued in compliance with the <strong>Kenya Data Protection Act, 2019</strong> and
              the <strong>Data Protection (General) Regulations, 2021</strong>.
            </p>
          </section>

          {/* 2 — Who controls your data */}
          <section>
            <h2 className="text-sm sm:text-base font-semibold text-zinc-900 mb-2">
              2. Data Controller and Data Processor
            </h2>
            <p>
              <strong>{workspace.name}</strong> (&ldquo;the Employer&rdquo;) is the <strong>Data Controller</strong>.
              The Employer determines why and how your personal data is processed for recruitment purposes.
            </p>
            <p className="mt-2">
              <strong>Bael Technologies Ltd</strong> (&ldquo;Bael&rdquo;), operating the bael.ai platform,
              acts solely as a <strong>Data Processor</strong> on behalf of the Employer.
              Bael processes your data only to provide the recruitment software service to the
              Employer and does not use your personal data for any other purpose.
            </p>
          </section>

          {/* 3 — What data we collect */}
          <section>
            <h2 className="text-sm sm:text-base font-semibold text-zinc-900 mb-2">
              3. Personal Data We Collect
            </h2>
            <p>When you submit an application, the following data may be collected:</p>
            <ul className="mt-2 space-y-1 list-disc pl-5">
              <li>Full name, email address, and phone number</li>
              <li>Resume / CV and cover letter</li>
              <li>LinkedIn profile URL or portfolio links</li>
              <li>Responses to job-specific application questions</li>
              <li>Any files or documents you choose to upload</li>
            </ul>
          </section>

          {/* 4 — Purpose */}
          <section>
            <h2 className="text-sm sm:text-base font-semibold text-zinc-900 mb-2">
              4. Purpose of Processing
            </h2>
            <p>Your personal data is processed exclusively for the following purposes:</p>
            <ul className="mt-2 space-y-1 list-disc pl-5">
              <li>Evaluating your suitability for the position you applied for</li>
              <li>Communicating with you about your application status</li>
              <li>Contacting you via email or phone in connection with the recruitment process</li>
              <li>Generating an AI-assisted summary of your qualifications to help the recruitment team review applications efficiently</li>
              <li>Maintaining records for legal and compliance purposes</li>
            </ul>
            <p className="mt-2">
              Your data will <strong>not</strong> be used for marketing, sold to third parties,
              or processed for any purpose unrelated to recruitment by {workspace.name}.
            </p>
          </section>

          {/* 5 — Legal basis */}
          <section>
            <h2 className="text-sm sm:text-base font-semibold text-zinc-900 mb-2">
              5. Legal Basis for Processing
            </h2>
            <p>
              The legal basis for processing your personal data is your <strong>explicit consent</strong>,
              which you provide by checking the consent box before submitting your application.
              You may withdraw your consent at any time by contacting the Employer, though this
              may affect the processing of your application.
            </p>
          </section>

          {/* 6 — Data sharing */}
          <section>
            <h2 className="text-sm sm:text-base font-semibold text-zinc-900 mb-2">
              6. Who Has Access to Your Data
            </h2>
            <p>Access to your personal data is strictly limited to:</p>
            <ul className="mt-2 space-y-1 list-disc pl-5">
              <li>
                <strong>Authorised members of {workspace.name}</strong> — only team members
                involved in the recruitment process within the Employer&apos;s workspace
              </li>
              <li>
                <strong>Bael (Data Processor)</strong> — solely for the purpose of operating
                the recruitment platform; Bael does not access, sell, share, or use your data independently
              </li>
            </ul>
            <p className="mt-2">
              Your data is <strong>not shared</strong> with any other third party, employer,
              organisation, or individual outside the Employer&apos;s workspace unless required
              by law.
            </p>
          </section>

          {/* 7 — Data security */}
          <section>
            <h2 className="text-sm sm:text-base font-semibold text-zinc-900 mb-2">
              7. Data Security
            </h2>
            <p>
              Your data is stored securely using industry-standard encryption and access controls.
              Each employer&apos;s data is isolated within the platform, ensuring that no other
              organisation can access your information. Uploaded files are stored in encrypted
              cloud storage with access restricted to authorised personnel only.
            </p>
          </section>

          {/* 8 — Data retention */}
          <section>
            <h2 className="text-sm sm:text-base font-semibold text-zinc-900 mb-2">
              8. Data Retention
            </h2>
            <p>
              Your personal data will be retained for as long as necessary to fulfil the
              recruitment process. If your application is unsuccessful, the Employer may retain
              your data for up to 12 months to consider you for future opportunities, unless
              you request earlier deletion. You may contact the Employer at any time to request
              deletion of your data.
            </p>
          </section>

          {/* 9 — Your rights */}
          <section>
            <h2 className="text-sm sm:text-base font-semibold text-zinc-900 mb-2">
              9. Your Rights
            </h2>
            <p>
              Under the Kenya Data Protection Act, 2019, you have the right to:
            </p>
            <ul className="mt-2 space-y-1 list-disc pl-5">
              <li><strong>Access</strong> — request a copy of the personal data held about you</li>
              <li><strong>Rectification</strong> — request correction of inaccurate or incomplete data</li>
              <li><strong>Erasure</strong> — request deletion of your personal data</li>
              <li><strong>Withdraw consent</strong> — withdraw your consent to data processing at any time</li>
              <li><strong>Object</strong> — object to the processing of your data</li>
              <li><strong>Complaint</strong> — lodge a complaint with the Office of the Data Protection Commissioner (ODPC) of Kenya</li>
            </ul>
            <p className="mt-2">
              To exercise any of these rights, please contact <strong>{workspace.name}</strong> directly
              through their official communication channels.
            </p>
          </section>

          {/* 10 — AI processing */}
          <section>
            <h2 className="text-sm sm:text-base font-semibold text-zinc-900 mb-2">
              10. AI-Assisted Processing
            </h2>
            <p>
              If you upload a resume, an AI system may be used to extract and summarise your
              qualifications, skills, and experience. This AI-generated summary is used solely
              to assist the Employer&apos;s recruitment team in reviewing applications. No automated
              decisions are made that produce legal effects or significantly affect you without
              human review.
            </p>
          </section>

          {/* 11 — Contact */}
          <section>
            <h2 className="text-sm sm:text-base font-semibold text-zinc-900 mb-2">
              11. Contact
            </h2>
            <p>
              For questions about how your data is processed, please contact <strong>{workspace.name}</strong> directly.
            </p>
            <p className="mt-2">
              For questions about the bael.ai platform, you may contact Bael Technologies Ltd
              at <a href="mailto:privacy@bael.ai" className="text-blue-600 hover:text-blue-700 underline">privacy@bael.ai</a>.
            </p>
            <p className="mt-2">
              You may also contact the <strong>Office of the Data Protection Commissioner (ODPC)</strong> at{' '}
              <a href="https://www.odpc.go.ke" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline">www.odpc.go.ke</a>.
            </p>
          </section>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-10 sm:mt-16 border-t border-zinc-200 pt-6 text-center">
        <p className="text-xs text-zinc-400">
          Powered by{' '}
          <a href="https://bael.ai" target="_blank" rel="noopener noreferrer" className="font-medium text-zinc-500 hover:text-zinc-700 underline">bael.ai</a>
        </p>
      </div>
    </div>
  )
}
