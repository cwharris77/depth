import { ImageResponse } from 'next/og';

export const alt = 'Depth · NFL Depth Charts';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Generic fallback card for the bare domain / home route.
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        background: '#0a0e1a',
        color: '#f0f4ff',
        padding: '0 80px',
        fontFamily: 'sans-serif',
      }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div
          style={{
            width: 56,
            height: 12,
            borderRadius: 6,
            background: '#69BE28',
            marginRight: 20,
          }}
        />
        <div
          style={{
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: 8,
            color: 'rgba(255,255,255,0.72)',
          }}>
          NFL DEPTH CHARTS
        </div>
      </div>
      <div style={{ fontSize: 150, fontWeight: 800, lineHeight: 1.05 }}>Depth</div>
      <div
        style={{
          fontSize: 40,
          fontWeight: 500,
          color: 'rgba(240,244,255,0.7)',
        }}>
        Every team. Every player. On the field.
      </div>
    </div>,
    { ...size }
  );
}
