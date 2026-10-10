import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Scotty Assistant',
    short_name: 'Scotty',
    description: 'Personal operations dashboard for meetings, tasks, agency projects, recruitment and more.',
    start_url: '/',
    display: 'standalone',
    background_color: '#06080e',
    theme_color: '#0b0f18',
    icons: []
  }
}
