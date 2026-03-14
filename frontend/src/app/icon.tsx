import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '32',
          height: '32',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#2563eb',
          borderRadius: '8px',
        }}
      >
        <div
          style={{
            fontSize: '22px',
            fontWeight: 700,
            color: 'white',
            lineHeight: 1,
            display: 'flex',
          }}
        >
          b
        </div>
      </div>
    ),
    { ...size }
  )
}
