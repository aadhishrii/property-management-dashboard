'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { fetchProperty } from '@/lib/api'
import type { UnitType } from '@/lib/api'

const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  APARTMENT: 'Apartment',
  OFFICE:    'Office',
  GARDEN:    'Garden',
  PARKING:   'Parking',
}

const UNIT_TYPE_COLOURS: Record<UnitType, string> = {
  APARTMENT: 'bg-blue-100 text-blue-700',
  OFFICE:    'bg-purple-100 text-purple-700',
  GARDEN:    'bg-green-100 text-green-700',
  PARKING:   'bg-gray-100 text-gray-600',
}

export default function PropertyDetailPage() {
  const { id }  = useParams<{ id: string }>()
  const router  = useRouter()

  const { data: property, isLoading, isError } = useQuery({
    queryKey: ['property', id],
    queryFn:  () => fetchProperty(id),
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
              <div className="h-4 w-full bg-gray-100 rounded" />
            </div>
          ))}
        </main>
      </div>
    )
  }

  if (isError || !property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Property not found</p>
          <button className="btn-primary" onClick={() => router.push('/')}>
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  const totalUnits = property.buildings.reduce(
    (sum, b) => sum + b.units.length, 0
  )

  const totalShareSum = property.buildings
    .flatMap(b => b.units)
    .reduce((sum, u) => sum + u.coOwnershipShare, 0)

  const shareOk = Math.abs(totalShareSum - 1) < 0.001

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-gray-900">{property.name}</h1>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  property.type === 'WEG'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {property.type}
                </span>
              </div>
              <p className="text-sm font-mono text-gray-400">{property.propertyNumber}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* Property info cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-400 mb-0.5">Manager</p>
            <p className="text-sm font-medium text-gray-900">{property.manager.name}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-400 mb-0.5">Accountant</p>
            <p className="text-sm font-medium text-gray-900">{property.accountant.name}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-400 mb-0.5">Buildings</p>
            <p className="text-sm font-medium text-gray-900">{property.buildings.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-400 mb-0.5">Total units</p>
            <p className="text-sm font-medium text-gray-900">{totalUnits}</p>
          </div>
        </div>

        {/* Co-ownership share status */}
        {property.type === 'WEG' && (
          <div className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-xs ${
            shareOk
              ? 'bg-green-50 text-green-700 border border-green-100'
              : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
          }`}>
            <span>Co-ownership shares</span>
            <span className="font-mono font-medium">
              {(totalShareSum * 1000).toFixed(1)} / 1000
              {shareOk ? ' ✓' : ' — does not total 1000'}
            </span>
          </div>
        )}

        {/* Buildings and units */}
        {property.buildings.map((building, buildingIndex) => (
          <div key={building.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">

            {/* Building header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Building {buildingIndex + 1}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {building.street} {building.houseNumber}, {building.postalCode} {building.city}
                </p>
              </div>
              <span className="text-xs text-gray-400">
                {building.units.length} {building.units.length === 1 ? 'unit' : 'units'}
              </span>
            </div>

            {/* Units table */}
            {building.units.length === 0 ? (
              <div className="px-5 py-6 text-center text-xs text-gray-400">
                No units in this building
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-2.5">Unit no.</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-2.5">Type</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-2.5">Floor</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-2.5">Entrance</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-2.5">Size (m²)</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-2.5">Share (‰)</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-2.5">Year</th>
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-2.5">Rooms</th>
                    </tr>
                  </thead>
                  <tbody>
                    {building.units.map((unit, unitIndex) => (
                      <tr
                        key={unit.id}
                        className={`border-b border-gray-50 last:border-0 ${
                          unitIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        }`}
                      >
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{unit.unitNumber}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${UNIT_TYPE_COLOURS[unit.unitType]}`}>
                            {UNIT_TYPE_LABELS[unit.unitType]}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-600">{unit.floor}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-600">{unit.entrance ?? '—'}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-600">{unit.sizeSqm}</td>
                        <td className="px-4 py-2.5 text-xs font-mono text-gray-600">
                          {(unit.coOwnershipShare * 1000).toFixed(1)}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-600">{unit.constructionYear ?? '—'}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-600">{unit.rooms ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}

      </main>
    </div>
  )
}