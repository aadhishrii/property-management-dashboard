'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
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
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#fff',
                color: '#111827',
                fontSize: '14px',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              },
              success: {
                iconTheme: {
                  primary: '#2563eb',
                  secondary: '#fff',
                },
              },
            }}
          />
        </QueryClientProvider>
      </body>
    </html>
  )
}
