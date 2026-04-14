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
  const [wizardOpen,  setWizardOpen]  = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter,  setTypeFilter]  = useState<PropertyType | 'ALL'>('ALL')

  const { data: properties = [], isLoading, refetch } = useQuery({
    queryKey: ['properties'],
    queryFn:  fetchProperties,
  })

  const filtered = useMemo(() => {
    return properties.filter(p => {
      const matchesSearch =
        searchQuery === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.propertyNumber.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = typeFilter === 'ALL' || p.type === typeFilter
      return matchesSearch && matchesType
    })
  }, [properties, searchQuery, typeFilter])

  const totalUnits = properties.reduce((sum, p) => sum + (p.unitCount ?? 0), 0)
  const wegCount   = properties.filter(p => p.type === 'WEG').length
  const mvCount    = properties.filter(p => p.type === 'MV').length

  function handleWizardComplete() {
    setWizardOpen(false)
    refetch()
  }

  return (
    <div className="min-h-screen" style={{ background: '#f8f7f4' }}>

      {/* Header */}
      <header style={{
        background: 'white',
        borderBottom: '1.5px solid #e5e1d8',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Logo mark */}
              <div style={{
                width: '32px',
                height: '32px',
                background: '#1a1a1a',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M3 7v1m0 4v1m0 4v1M21 7v1m0 4v1m0 4v1M9 21V3h6v18M3 3h18" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a', letterSpacing: '-0.02em' }}>Buena</div>
                <div style={{ fontSize: '11px', color: '#9a9a8a', marginTop: '-2px' }}>Property management</div>
              </div>
            </div>
            <button
              className="btn-primary"
              onClick={() => setWizardOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create property
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Stats row — only when properties exist */}
        {properties.length > 0 && (
          <div className="stagger-children" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginBottom: '28px',
          }}>
            {[
              { label: 'Total properties', value: properties.length },
              { label: 'WEG properties',   value: wegCount },
              { label: 'MV properties',    value: mvCount },
              { label: 'Total units',      value: totalUnits },
            ].map(stat => (
              <div
                key={stat.label}
                className="fade-in-up"
                style={{
                  background: 'white',
                  border: '1.5px solid #e5e1d8',
                  borderRadius: '12px',
                  padding: '16px 20px',
                }}
              >
                <div style={{ fontSize: '11px', color: '#9a9a8a', marginBottom: '4px', letterSpacing: '0.02em' }}>
                  {stat.label.toUpperCase()}
                </div>
                <div style={{ fontSize: '28px', fontWeight: '600', color: '#1a1a1a', letterSpacing: '-0.03em' }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search and filter */}
        {properties.length > 0 && (
          <div className="fade-in-up" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px',
            animationDelay: '100ms',
          }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
              <svg
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9a9a8a' }}
                width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                className="input"
                style={{ paddingLeft: '36px' }}
                placeholder="Search by name or number..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{
              display: 'flex',
              background: 'white',
              border: '1.5px solid #e5e1d8',
              borderRadius: '10px',
              padding: '3px',
              gap: '2px',
            }}>
              {(['ALL', 'WEG', 'MV'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  style={{
                    padding: '5px 14px',
                    borderRadius: '7px',
                    fontSize: '13px',
                    fontWeight: '500',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    background: typeFilter === t ? '#1a1a1a' : 'transparent',
                    color: typeFilter === t ? 'white' : '#6a6a5a',
                  }}
                >
                  {t === 'ALL' ? 'All' : t}
                </button>
              ))}
            </div>

            <span style={{ fontSize: '12px', color: '#9a9a8a', marginLeft: 'auto' }}>
              {filtered.length} of {properties.length}
            </span>
          </div>
        )}

        {isLoading ? (
          <LoadingSkeleton />
        ) : properties.length === 0 ? (
          <EmptyState onCreateClick={() => setWizardOpen(true)} />
        ) : filtered.length === 0 ? (
          <NoResults onClear={() => { setSearchQuery(''); setTypeFilter('ALL') }} />
        ) : (
          <PropertyList properties={filtered} onDeleted={refetch} />
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{
          background: 'white',
          borderRadius: '12px',
          border: '1.5px solid #e5e1d8',
          padding: '20px',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ width: '100px', height: '12px', background: '#f0ede8', borderRadius: '4px' }} />
            <div style={{ width: '200px', height: '12px', background: '#f0ede8', borderRadius: '4px' }} />
            <div style={{ width: '60px', height: '20px', background: '#f0ede8', borderRadius: '20px', marginLeft: 'auto' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="animate-scale-in" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '64px 0',
      textAlign: 'center',
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        background: 'white',
        border: '1.5px solid #e5e1d8',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '16px',
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9a9a8a" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
      </div>
      <p style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a', marginBottom: '4px' }}>No properties found</p>
      <p style={{ fontSize: '12px', color: '#9a9a8a', marginBottom: '16px' }}>Try adjusting your search or filter</p>
      <button className="btn-secondary" style={{ fontSize: '13px' }} onClick={onClear}>
        Clear filters
      </button>
    </div>
  )
}
