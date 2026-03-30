import { ImageResponse } from 'next/og';

export const size = {
  width: 512,
  height: 512,
};

export const contentType = 'image/png';

export default function Icon() {
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
            width: 432,
            height: 432,
            borderRadius: 108,
            background: 'linear-gradient(145deg, #4f46e5 0%, #3d5afe 100%)',
            boxShadow: '0 32px 80px rgba(79, 70, 229, 0.28)',
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
          <div
            style={{
              width: 226,
              height: 226,
              borderRadius: 62,
              background: 'rgba(255,255,255,0.16)',
              border: '1px solid rgba(255,255,255,0.28)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              transform: 'rotate(-8deg)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 62,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.24), rgba(255,255,255,0.06))',
              }}
            />
            <svg width="126" height="102" viewBox="0 0 126 102" fill="none">
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
      </div>
    ),
    size
  );
}
