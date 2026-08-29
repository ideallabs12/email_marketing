import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Route segment config
export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

// Image generation
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 90,
          background: '#18181b', // zinc-900
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 800,
          fontFamily: 'sans-serif'
        }}
      >
        EP
      </div>
    ),
    {
      ...size,
    }
  );
}
