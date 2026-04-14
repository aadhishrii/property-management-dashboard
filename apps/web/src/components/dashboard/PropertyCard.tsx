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
  const router      = useRouter()
  const buildingCount = property._count.buildings
  const [confirming, setConfirming] = useState(false)
  const [deleting,   setDeleting]   = useState(false)

  async function handleDelete(e: React.MouseEvent) {
    // Stop the click from navigating to the detail page
    e.stopPropagation()

    if (!confirming) {
      setConfirming(true)
      return
    }

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

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-6 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
      onClick={() => router.push(`/properties/${property.id}`)}
    >
      {/* Property number */}
      <span className="font-mono text-xs text-gray-400 w-32 shrink-0">
        {property.propertyNumber}
      </span>

      {/* Name */}
      <span className="font-medium text-gray-900 flex-1 truncate">
        {property.name}
      </span>

      {/* WEG / MV badge */}
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
        property.type === 'WEG'
          ? 'bg-purple-100 text-purple-700'
          : 'bg-blue-100 text-blue-700'
      }`}>
        {property.type}
      </span>

      {/* Manager */}
      <span className="text-sm text-gray-500 w-36 truncate shrink-0">
        {property.manager.name}
      </span>

      {/* Building and unit count */}
      <span className="text-sm text-gray-400 w-40 text-right shrink-0">
  {buildingCount} {buildingCount === 1 ? 'building' : 'buildings'}
  {' · '}
  {property.unitCount} {property.unitCount === 1 ? 'unit' : 'units'}
</span>

      {/* Created date */}
      <span className="text-xs text-gray-400 w-24 text-right shrink-0">
        {new Date(property.createdAt).toLocaleDateString('de-DE', {
          day:   '2-digit',
          month: '2-digit',
          year:  'numeric',
        })}
      </span>

      {/* Delete button — two step confirmation inline */}
      {confirming ? (
        <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
          <span className="text-xs text-red-600 font-medium">Delete?</span>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs bg-red-600 text-white px-2 py-1 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {deleting ? '...' : 'Yes'}
          </button>
          <button
            onClick={handleCancelDelete}
            className="text-xs border border-gray-300 text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors"
          >
            No
          </button>
        </div>
      ) : (
        <button
          onClick={handleDelete}
          className="p-1 text-gray-300 hover:text-red-400 transition-colors shrink-0"
          title="Delete property"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}

      {/* Arrow */}
      <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  )
}