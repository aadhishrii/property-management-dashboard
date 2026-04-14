import type { Property } from '@/lib/api'

interface PropertyCardProps {
  property: Property
}

export function PropertyCard({ property }: PropertyCardProps) {
  const buildingCount = property._count.buildings

  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-6 hover:border-gray-300 transition-colors">

      {/* Property number — monospace so numbers align across rows */}
      <span className="font-mono text-xs text-gray-400 w-32 shrink-0">
        {property.propertyNumber}
      </span>

      {/* Name */}
      <span className="font-medium text-gray-900 flex-1 truncate">
        {property.name}
      </span>

      {/* WEG / MV badge — different colours so you can scan the list */}
      <span
        className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
          property.type === 'WEG'
            ? 'bg-purple-100 text-purple-700'
            : 'bg-blue-100 text-blue-700'
        }`}
      >
        {property.type}
      </span>

      {/* Manager */}
      <span className="text-sm text-gray-500 w-36 truncate shrink-0">
        {property.manager.name}
      </span>

      {/* Building count */}
      <span className="text-sm text-gray-400 w-24 text-right shrink-0">
        {buildingCount} {buildingCount === 1 ? 'building' : 'buildings'}
      </span>

      {/* Created date */}
      <span className="text-xs text-gray-400 w-24 text-right shrink-0">
        {new Date(property.createdAt).toLocaleDateString('de-DE', {
          day:   '2-digit',
          month: '2-digit',
          year:  'numeric',
        })}
      </span>
    </div>
  )
}