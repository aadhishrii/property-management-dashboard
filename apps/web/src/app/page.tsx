'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchProperties } from '@/lib/api'
import { PropertyList } from '@/components/dashboard/PropertyList'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { WizardShell } from '@/components/wizard/WizardShell'
import { WizardProvider } from '@/context/WizardContext'

export default function DashboardPage() {
  const [wizardOpen, setWizardOpen] = useState(false)

  const { data: properties = [], isLoading, refetch } = useQuery({
    queryKey: ['properties'],
    queryFn:  fetchProperties,
  })

  function handleWizardComplete() {
    setWizardOpen(false)
    refetch()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Buena</h1>
            <p className="text-sm text-gray-500">Property management</p>
          </div>
          <button
            className="btn-primary"
            onClick={() => setWizardOpen(true)}
          >
            + Create new property
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {properties.length > 0 && (
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">
              Properties
              <span className="ml-2 text-sm font-normal text-gray-500">
                {properties.length} total
              </span>
            </h2>
          </div>
        )}

        {isLoading ? (
          <LoadingSkeleton />
        ) : properties.length === 0 ? (
          <EmptyState onCreateClick={() => setWizardOpen(true)} />
        ) : (
          <PropertyList properties={properties} />
        )}
      </main>

      {/* Wizard modal */}
      {wizardOpen && (
        <WizardProvider>
          <WizardShell
            onComplete={handleWizardComplete}
            onClose={() => setWizardOpen(false)}
          />
        </WizardProvider>
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse"
        >
          <div className="flex items-center gap-4">
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-4 w-48 bg-gray-200 rounded" />
            <div className="h-4 w-20 bg-gray-200 rounded ml-auto" />
          </div>
        </div>
      ))}
    </div>
  )
}
