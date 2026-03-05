'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function CandidateSearchRedirect() {
  const router = useRouter()
  const { slug } = useParams<{ slug: string }>()

  useEffect(() => {
    router.replace(`/w/${slug}/candidates`)
  }, [router, slug])

  return null
}
