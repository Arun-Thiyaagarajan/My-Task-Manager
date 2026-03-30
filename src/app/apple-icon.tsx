import { ImageResponse } from 'next/og';

export const size = {
  width: 180,
  height: 180,
};

export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #eef2ff 0%, #ffffff 48%, #e0e7ff 100%)',
        }}
      >
        <div
          style={{
            width: 152,
            height: 152,
            borderRadius: 40,
            background: 'linear-gradient(145deg, #4f46e5 0%, #3d5afe 100%)',
            boxShadow: '0 16px 40px rgba(79, 70, 229, 0.24)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at 25% 20%, rgba(255,255,255,0.34), transparent 40%)',
            }}
          />
          <svg width="68" height="54" viewBox="0 0 126 102" fill="none" style={{ position: 'relative' }}>
            <path
              d="M16 54L44 82L110 16"
              stroke="#ffffff"
              strokeWidth="18"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    ),
    size
  );
}
