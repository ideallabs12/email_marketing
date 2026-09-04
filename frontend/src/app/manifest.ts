import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Email Marketing Platform',
    short_name: 'EmailPlatform',
    description: 'A sleek, monochromatic email marketing platform.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f4f5',
    theme_color: '#18181b',
    icons: [
      {
        src: '/icon?size=192',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon?size=512',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      }
    ],
  };
}
