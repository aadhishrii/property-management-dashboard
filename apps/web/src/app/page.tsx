'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchProperties } from '@/lib/api'
import { PropertyList } from '@/components/dashboard/PropertyList'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { WizardShell } from '@/components/wizard/WizardShell'
import { WizardProvider } from '@/context/WizardContext'
import type { PropertyType } from '@/lib/api'

export default function DashboardPage() {
  const [wizardOpen,   setWizardOpen]   = useState(false)
  const [searchQuery,  setSearchQuery]  = useState('')
  const [typeFilter,   setTypeFilter]   = useState<PropertyType | 'ALL'>('ALL')

  const { data: properties = [], isLoading, refetch } = useQuery({
    queryKey: ['properties'],
    queryFn:  fetchProperties,
  })

  // Filter properties client-side — no backend call needed
  // since the full list is already loaded and cached by React Query
  const filtered = useMemo(() => {
    return properties.filter(p => {
      const matchesSearch =
        searchQuery === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.propertyNumber.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesType =
        typeFilter === 'ALL' || p.type === typeFilter

      return matchesSearch && matchesType
    })
  }, [properties, searchQuery, typeFilter])

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

      <main className="max-w-6xl mx-auto px-6 py-8">

        {/* Search and filter bar — only show when there are properties */}
        {properties.length > 0 && (
          <div className="mb-6 flex items-center gap-3">
            {/* Search input */}
            <div className="relative flex-1 max-w-sm">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                className="input pl-9"
                placeholder="Search by name or number..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Type filter */}
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
              {(['ALL', 'WEG', 'MV'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    typeFilter === t
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t === 'ALL' ? 'All' : t}
                </button>
              ))}
            </div>

            {/* Results count */}
            <span className="text-sm text-gray-400 ml-auto">
              {filtered.length} of {properties.length}
            </span>
          </div>
        )}

        {isLoading ? (
          <LoadingSkeleton />
        ) : properties.length === 0 ? (
          <EmptyState onCreateClick={() => setWizardOpen(true)} />
        ) : filtered.length === 0 ? (
          <NoResults
            onClear={() => { setSearchQuery(''); setTypeFilter('ALL') }}
          />
        ) : (
          <PropertyList
            properties={filtered}
            onDeleted={refetch}
          />
        )}
      </main>

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

function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-700 mb-1">No properties found</p>
      <p className="text-xs text-gray-400 mb-4">Try adjusting your search or filter</p>
      <button className="btn-secondary text-xs" onClick={onClear}>
        Clear filters
      </button>
    </div>
  )
}
