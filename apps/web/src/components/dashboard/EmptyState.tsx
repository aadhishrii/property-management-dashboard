interface EmptyStateProps {
  onCreateClick: () => void
}

export function EmptyState({ onCreateClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="relative mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
          <svg
            className="w-8 h-8 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"
            />
          </svg>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        No properties yet
      </h3>
      <p className="text-sm text-gray-500 mb-6 max-w-sm">
        Create your first property to get started. You can import data from a
        Teilungserklärung PDF to speed things up.
      </p>

      <button className="btn-primary" onClick={onCreateClick}>
        + Create first property
      </button>
    </div>
  )
}