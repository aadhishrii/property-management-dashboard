'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // QueryClient created inside component with useState so each session
  // gets its own cache — important for server rendering.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data is fresh for 30 seconds — avoids refetching on every
            // focus event while the user is mid-wizard
            staleTime: 30 * 1000,
            retry: 1,
          },
        },
      }),
  )

  return (
    <html lang="en">
      <head>
        <title>Buena — Property Management</title>
        <meta name="description" content="Property creation and management" />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </body>
    </html>
  )
}
