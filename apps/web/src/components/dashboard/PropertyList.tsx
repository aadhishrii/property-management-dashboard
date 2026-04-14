import type { Property } from '@/lib/api'
import { PropertyCard } from './PropertyCard'

interface PropertyListProps {
  properties: Property[]
  onDeleted:  () => void
}

export function PropertyList({ properties, onDeleted }: PropertyListProps) {
  return (
    <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {properties.map((property) => (
        <PropertyCard
          key={property.id}
          property={property}
          onDeleted={onDeleted}
        />
      ))}
    </div>
  )
}