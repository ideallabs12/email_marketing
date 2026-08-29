import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Route segment config
export const size = {
  width: 512,
  height: 512,
};
export const contentType = 'image/png';

// Image generation
export default function Icon({ searchParams }: { searchParams: { size?: string } }) {
  const customSize = searchParams.size ? parseInt(searchParams.size, 10) : 512;
  
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: customSize * 0.5,
          background: '#18181b', // zinc-900
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '20%',
          fontWeight: 800,
          fontFamily: 'sans-serif'
        }}
      >
        EP
      </div>
    ),
    {
      width: customSize,
      height: customSize,
    }
  );
}
