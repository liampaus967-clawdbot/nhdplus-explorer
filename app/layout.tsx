import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NHDPlus Waterbody Explorer',
  description: 'Explore lakes, ponds, and reservoirs from the USGS NHDPlus dataset',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link 
          href="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css" 
          rel="stylesheet" 
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
