'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Property } from '@/lib/api'
import { deleteProperty } from '@/lib/api'
import toast from 'react-hot-toast'

interface PropertyCardProps {
  property:  Property
  onDeleted: () => void
}

export function PropertyCard({ property, onDeleted }: PropertyCardProps) {
  const router        = useRouter()
  const buildingCount = property._count.buildings
  const [confirming,  setConfirming]  = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [hovered,     setHovered]     = useState(false)

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirming) { setConfirming(true); return }
    setDeleting(true)
    try {
      await deleteProperty(property.id)
      toast.success(`${property.name} deleted`)
      onDeleted()
    } catch {
      setDeleting(false)
      setConfirming(false)
    }
  }

  function handleCancelDelete(e: React.MouseEvent) {
    e.stopPropagation()
    setConfirming(false)
  }

  const accentColor = property.type === 'WEG' ? '#7c3aed' : '#2563eb'

  return (
    <div
      className="fade-in-up"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirming(false) }}
      onClick={() => router.push(`/properties/${property.id}`)}
      style={{
        background: 'white',
        borderRadius: '12px',
        border: '1.5px solid #e5e1d8',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        borderLeft: `3px solid ${accentColor}`,
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        boxShadow: hovered ? '0 4px 16px -4px rgba(0,0,0,0.1)' : 'none',
      }}
    >
      {/* Property number */}
      <span style={{
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#9a9a8a',
        width: '120px',
        flexShrink: 0,
        letterSpacing: '0.02em',
      }}>
        {property.propertyNumber}
      </span>

      {/* Name */}
      <span style={{
        fontSize: '14px',
        fontWeight: '500',
        color: '#1a1a1a',
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        letterSpacing: '-0.01em',
      }}>
        {property.name}
      </span>

      {/* Type badge */}
      <span style={{
        fontSize: '11px',
        fontWeight: '600',
        padding: '3px 10px',
        borderRadius: '20px',
        flexShrink: 0,
        letterSpacing: '0.03em',
        background: property.type === 'WEG' ? '#f3e8ff' : '#dbeafe',
        color: property.type === 'WEG' ? '#6d28d9' : '#1d4ed8',
      }}>
        {property.type}
      </span>

      {/* Manager */}
      <span style={{
        fontSize: '13px',
        color: '#6a6a5a',
        width: '140px',
        flexShrink: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {property.manager.name}
      </span>

      {/* Building + unit count */}
      <span style={{
        fontSize: '12px',
        color: '#9a9a8a',
        width: '160px',
        textAlign: 'right',
        flexShrink: 0,
      }}>
        {buildingCount} {buildingCount === 1 ? 'building' : 'buildings'}
        {' · '}
        {property.unitCount ?? 0} units
      </span>

      {/* Date */}
      <span style={{
        fontSize: '11px',
        color: '#b0ad9a',
        width: '80px',
        textAlign: 'right',
        flexShrink: 0,
      }}>
        {new Date(property.createdAt).toLocaleDateString('de-DE', {
          day: '2-digit', month: '2-digit', year: 'numeric',
        })}
      </span>

      {/* Delete */}
      {confirming ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
          onClick={e => e.stopPropagation()}>
          <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: '500' }}>Delete?</span>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              fontSize: '12px',
              background: '#dc2626',
              color: 'white',
              padding: '3px 10px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {deleting ? '...' : 'Yes'}
          </button>
          <button
            onClick={handleCancelDelete}
            style={{
              fontSize: '12px',
              background: 'white',
              border: '1.5px solid #e5e1d8',
              color: '#6a6a5a',
              padding: '3px 10px',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            No
          </button>
        </div>
      ) : (
        <button
          onClick={handleDelete}
          style={{
            padding: '4px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: hovered ? '#d1d5db' : 'transparent',
            transition: 'color 0.15s ease',
            flexShrink: 0,
          }}
          title="Delete property"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}

      {/* Arrow */}
      <svg
        width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke={hovered ? '#9a9a8a' : '#d1cfc8'} strokeWidth="2"
        style={{ flexShrink: 0, transition: 'all 0.15s ease', transform: hovered ? 'translateX(2px)' : 'none' }}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </div>
  )
}