import { useRouter } from 'next/navigation'
import type { Property } from '@/lib/api'

interface PropertyCardProps {
  property: Property
}

export function PropertyCard({ property }: PropertyCardProps) {
  const router        = useRouter()
  const buildingCount = property._count.buildings

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-6 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
      onClick={() => router.push(`/properties/${property.id}`)}
    >
      <span className="font-mono text-xs text-gray-400 w-32 shrink-0">
        {property.propertyNumber}
      </span>

      <span className="font-medium text-gray-900 flex-1 truncate">
        {property.name}
      </span>

      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
        property.type === 'WEG'
          ? 'bg-purple-100 text-purple-700'
          : 'bg-blue-100 text-blue-700'
      }`}>
        {property.type}
      </span>

      <span className="text-sm text-gray-500 w-36 truncate shrink-0">
        {property.manager.name}
      </span>

      <span className="text-sm text-gray-400 w-24 text-right shrink-0">
        {buildingCount} {buildingCount === 1 ? 'building' : 'buildings'}
      </span>

      <span className="text-xs text-gray-400 w-24 text-right shrink-0">
        {new Date(property.createdAt).toLocaleDateString('de-DE', {
          day:   '2-digit',
          month: '2-digit',
          year:  'numeric',
        })}
      </span>

      {/* Arrow indicator */}
      <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  )
}