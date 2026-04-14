interface EmptyStateProps {
  onCreateClick: () => void
}

export function EmptyState({ onCreateClick }: EmptyStateProps) {
  return (
    <div className="animate-scale-in" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '80px 0',
      textAlign: 'center',
    }}>
      {/* Building illustration */}
      <div style={{
        width: '80px',
        height: '80px',
        background: 'white',
        border: '1.5px solid #e5e1d8',
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px',
        boxShadow: '0 4px 16px -4px rgba(0,0,0,0.08)',
      }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
        </svg>
      </div>

      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a', marginBottom: '8px', letterSpacing: '-0.02em' }}>
        No properties yet
      </h3>
      <p style={{ fontSize: '13px', color: '#9a9a8a', marginBottom: '28px', maxWidth: '300px', lineHeight: '1.6' }}>
        Create your first property to get started. Upload a Teilungserklärung PDF to auto-fill buildings and units.
      </p>

      <button
        className="btn-primary"
        onClick={onCreateClick}
        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Create first property
      </button>
    </div>
  )
}