'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { useWizard, makeEmptyUnit } from '@/context/WizardContext'
import { upsertUnits } from '@/lib/api'
import type { UnitFormData } from '@/context/WizardContext'
import type { UnitType } from '@/lib/api'
import toast from 'react-hot-toast'


const UNIT_TYPES: UnitType[] = ['APARTMENT', 'OFFICE', 'GARDEN', 'PARKING']

const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  APARTMENT: 'Apartment',
  OFFICE:    'Office',
  GARDEN:    'Garden',
  PARKING:   'Parking',
}


const COLUMNS = [
  { key: 'unitNumber',       label: 'Unit no.',  width: 'min-w-[80px]'  },
  { key: 'unitType',         label: 'Type',      width: 'min-w-[110px]' },
  { key: 'buildingId',       label: 'Building',  width: 'min-w-[160px]' },
  { key: 'floor',            label: 'Floor',     width: 'min-w-[70px]'  },
  { key: 'entrance',         label: 'Entrance',  width: 'min-w-[80px]'  },
  { key: 'sizeSqm',          label: 'Size (m²)', width: 'min-w-[90px]'  },
  { key: 'coOwnershipShare', label: 'Share (‰)', width: 'min-w-[90px]'  },
  { key: 'constructionYear', label: 'Year',      width: 'min-w-[80px]'  },
  { key: 'rooms',            label: 'Rooms',     width: 'min-w-[70px]'  },
] as const

interface Step3UnitsProps {
  onComplete: () => void
}

export function Step3Units({ onComplete }: Step3UnitsProps) {
  const { state, dispatch } = useWizard()
  const [showGenerator, setShowGenerator] = useState(false)
  const [genCount,       setGenCount]       = useState<number | ''>(10)
  const [genStartNumber, setGenStartNumber] = useState('')
  const [genPrefix,      setGenPrefix]      = useState('W-')
  const [genType,        setGenType]        = useState<UnitType>('APARTMENT')
  const [genBuildingId,  setGenBuildingId]  = useState('')
  const [genFloorCount,  setGenFloorCount]  = useState<number | ''>(1)
  const [genUnitsPerFloor, setGenUnitsPerFloor] = useState<number | ''>(1)
  const [genStartFloor,  setGenStartFloor]  = useState<number | ''>(0)
  const [genEntrance,    setGenEntrance]    = useState('')
  const [genYear,        setGenYear]        = useState<number | ''>(2023)
  const [genRooms,       setGenRooms]       = useState<number | ''>('')
  const [genShareEach,   setGenShareEach]   = useState<number | ''>('')
  const [genSizeSqm, setGenSizeSqm] = useState<number | ''>('')



  const [units,        setUnits]        = useState<UnitFormData[]>(state.units)
  const [errors,       setErrors]       = useState<Record<string, string>>({})
  const [submitting,   setSubmitting]   = useState(false)
  const [shareWarning, setShareWarning] = useState<string | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  function updateUnit(rowIndex: number, field: keyof UnitFormData, value: string | number) {
    setUnits((prev) =>
      prev.map((u, i) => (i === rowIndex ? { ...u, [field]: value } : u)),
    )
  }

  function addRow() {
    setUnits((prev) => [...prev, makeEmptyUnit()])
  }

  function cloneRow(index: number) {
    const source    = units[index]
    const newNumber = incrementUnitNumber(source.unitNumber)
    setUnits((prev) => [
      ...prev.slice(0, index + 1),
      { ...source, id: Math.random().toString(36).slice(2), unitNumber: newNumber },
      ...prev.slice(index + 1),
    ])
  }


  function deleteRow(index: number) {
    if (units.length === 1) return
    setUnits((prev) => prev.filter((_, i) => i !== index))
  }

  function handleCellKeyDown(
    e: KeyboardEvent<HTMLElement>,
    rowIndex: number,
    colIndex: number,
  ) {
    if (e.key !== 'Tab') return

    const isLastCol = colIndex === COLUMNS.length - 1
    const isLastRow = rowIndex === units.length - 1

    if (isLastCol && isLastRow) {
      e.preventDefault()
      addRow()
      setTimeout(() => {
        const rows     = tableRef.current?.querySelectorAll('[data-row]')
        const newRow   = rows?.[rowIndex + 1]
        const firstInput = newRow?.querySelector<HTMLElement>('input,select')
        firstInput?.focus()
      }, 0)
    }
  }


  // Calculate share total in per-mille for display
  const shareTotal = units.reduce((sum, u) => {
    const val = typeof u.coOwnershipShare === 'number'
      ? u.coOwnershipShare
      : parseFloat(u.coOwnershipShare as string) || 0
    return sum + val
  }, 0)

  const shareOk = Math.abs(shareTotal / 1000 - 1) < 0.001

  function validate() {
    const e: Record<string, string> = {}
    units.forEach((u, i) => {
      if (!u.unitNumber)            e[`${i}.unitNumber`]       = 'Required'
      if (!u.buildingId)            e[`${i}.buildingId`]       = 'Required'
      if (u.sizeSqm === '')         e[`${i}.sizeSqm`]          = 'Required'
      if (u.coOwnershipShare === '') e[`${i}.coOwnershipShare`] = 'Required'
    })
    return e
  }

  function generateUnits() {
  if (!genCount || !genPrefix) return

  const count        = Number(genCount)
  const startNumber  = genStartNumber ? parseInt(genStartNumber) : 1
  const unitsPerFloor = Number(genUnitsPerFloor) || 1
  const startFloor   = Number(genStartFloor) ?? 0

  const generated: UnitFormData[] = Array.from({ length: count }, (_, i) => {
    const floor = startFloor + Math.floor(i / unitsPerFloor)
    const unitNum = startNumber + i

    return {
      id:               Math.random().toString(36).slice(2),
      unitNumber:       `${genPrefix}${String(unitNum).padStart(2, '0')}`,
      unitType:         genType,
      buildingId:       genBuildingId,
      floor,
      entrance:         genEntrance,
      sizeSqm: genSizeSqm !== '' ? genSizeSqm : '',
      coOwnershipShare: genShareEach !== '' ? genShareEach : '',
      constructionYear: genYear !== '' ? genYear : '',
      rooms:            genRooms !== '' ? genRooms : '',
    }
  })

  // Append to existing units rather than replacing them
  setUnits(prev => [...prev.filter(u => u.unitNumber !== ''), ...generated])
  setShowGenerator(false)
}

  async function handleSubmit() {
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    if (!state.propertyId) return
    setSubmitting(true)
    setErrors({})

    try {
      const payload = units.map((u) => ({
  unitNumber:       u.unitNumber,
  unitType:         u.unitType,
  buildingId:       u.buildingId,
  floor:            Number(u.floor) || 0,
  entrance:         u.entrance || undefined,
  sizeSqm:          Number(u.sizeSqm),
  coOwnershipShare: Number(u.coOwnershipShare) / 1000,
  constructionYear: u.constructionYear !== '' && u.constructionYear !== undefined
    ? Number(u.constructionYear)
    : undefined,
  rooms: u.rooms !== '' && u.rooms !== undefined
    ? Number(u.rooms)
    : undefined,
}))

      const result = await upsertUnits(state.propertyId, payload)

      if (result.shareWarning) {
        setShareWarning(result.shareWarning)
      }

      dispatch({ type: 'SET_UNITS', data: units })
      toast.success(`Property created successfully`)
      onComplete()
    } catch (err: any) {
      const msg = err?.response?.data?.message
      setErrors({ submit: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Something went wrong' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {state.aiPrefilled && units.some(u => u.unitNumber) && (
        <div className="bg-purple-50 border border-purple-100 rounded-lg px-3 py-2 text-xs text-purple-700">
          <span className="font-medium">AI pre-filled {units.filter(u => u.unitNumber).length} units</span> — assign each unit to a building using the Building column, then review and confirm.
        </div>
      )}

      {/* Bulk unit generator modal */}
{showGenerator && (
  <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-4 space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Bulk unit generator</h3>
        <p className="text-xs text-gray-500 mt-0.5">Generate multiple units with a pattern in one click</p>
      </div>
      <button
        type="button"
        onClick={() => setShowGenerator(false)}
        className="text-gray-400 hover:text-gray-600"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div className="grid grid-cols-4 gap-3">
      {/* Prefix */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Unit prefix</label>
        <input
          className="input text-sm"
          placeholder="W-"
          value={genPrefix}
          onChange={e => setGenPrefix(e.target.value)}
        />
      </div>

      {/* Starting number */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Starting number</label>
        <input
          type="number"
          className="input text-sm"
          placeholder="101"
          value={genStartNumber}
          onChange={e => setGenStartNumber(e.target.value)}
        />
      </div>

      {/* Total count */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Total units</label>
        <input
          type="number"
          className="input text-sm"
          placeholder="24"
          value={genCount}
          onChange={e => setGenCount(e.target.value ? Number(e.target.value) : '')}
        />
      </div>

      {/* Units per floor */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Units per floor</label>
        <input
          type="number"
          className="input text-sm"
          placeholder="6"
          value={genUnitsPerFloor}
          onChange={e => setGenUnitsPerFloor(e.target.value ? Number(e.target.value) : '')}
        />
      </div>

      {/* Starting floor */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Starting floor</label>
        <input
          type="number"
          className="input text-sm"
          placeholder="0"
          value={genStartFloor}
          onChange={e => setGenStartFloor(e.target.value !== '' ? Number(e.target.value) : '')}
        />
      </div>

      {/* Unit type */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Unit type</label>
        <select
          className="input text-sm"
          value={genType}
          onChange={e => setGenType(e.target.value as UnitType)}
        >
          {UNIT_TYPES.map(t => (
            <option key={t} value={t}>{UNIT_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {/* Size */}
<div>
  <label className="block text-xs text-gray-500 mb-1">Size (m²)</label>
  <input
    type="number"
    className="input text-sm"
    placeholder="68"
    value={genSizeSqm}
    onChange={e => setGenSizeSqm(e.target.value ? Number(e.target.value) : '')}
  />
</div>

      {/* Building */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Building</label>
        <select
          className="input text-sm"
          value={genBuildingId}
          onChange={e => setGenBuildingId(e.target.value)}
        >
          <option value="">Select</option>
          {state.savedBuildings.map((b, i) => (
            <option key={b.id} value={b.id}>
              {b.street} {b.houseNumber} (Bldg {i + 1})
            </option>
          ))}
        </select>
      </div>

      {/* Entrance */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Entrance</label>
        <input
          className="input text-sm"
          placeholder="A"
          value={genEntrance}
          onChange={e => setGenEntrance(e.target.value)}
        />
      </div>

      {/* Construction year */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Construction year</label>
        <input
          type="number"
          className="input text-sm"
          placeholder="2023"
          value={genYear}
          onChange={e => setGenYear(e.target.value ? Number(e.target.value) : '')}
        />
      </div>

      {/* Rooms */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Rooms</label>
        <input
          type="number"
          className="input text-sm"
          placeholder="3"
          value={genRooms}
          onChange={e => setGenRooms(e.target.value ? Number(e.target.value) : '')}
        />
      </div>

      {/* Share per unit */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Share each (‰)</label>
        <input
          type="number"
          className="input text-sm"
          placeholder="41.6"
          value={genShareEach}
          onChange={e => setGenShareEach(e.target.value ? Number(e.target.value) : '')}
        />
      </div>
    </div>

    {/* Preview */}
    {genCount && genPrefix && (
      <div className="bg-white border border-blue-100 rounded-lg px-3 py-2 text-xs text-gray-500">
        Will generate <span className="font-medium text-gray-900">{genCount} units</span>
        {' '}named <span className="font-mono font-medium text-gray-900">{genPrefix}{genStartNumber || '01'}</span>
        {' '}to <span className="font-mono font-medium text-gray-900">{genPrefix}{String((parseInt(genStartNumber || '1') + Number(genCount) - 1)).padStart(2, '0')}</span>
        {genUnitsPerFloor && genStartFloor !== ''
          ? `, floors ${genStartFloor} to ${Number(genStartFloor) + Math.ceil(Number(genCount) / Number(genUnitsPerFloor)) - 1}`
          : ''
        }
      </div>
    )}

    <div className="flex justify-end">
      <button
        type="button"
        className="btn-primary"
        onClick={generateUnits}
        disabled={!genCount || !genPrefix}
      >
        Generate {genCount || ''} units
      </button>
    </div>
  </div>
)}

{/* Button to open generator */}
{!showGenerator && (
  <button
    type="button"
    onClick={() => setShowGenerator(true)}
    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
  >
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
    Bulk generate units
  </button>
)}

      {/* Scrollable table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200" ref={tableRef}>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`text-left text-xs font-medium text-gray-500 px-2 py-2.5 ${col.width}`}
                >
                  {col.label}
                </th>
              ))}
              <th className="w-16" />
            </tr>
          </thead>

          <tbody>
            {units.map((unit, rowIndex) => (
              <tr
                key={unit.id}
                data-row={rowIndex}
                className={`border-b border-gray-100 last:border-0 ${
                  state.aiPrefilled && unit.unitNumber ? 'bg-purple-50/30' : 'bg-white'
                }`}
              >
                {/* Unit number */}
                <td className="px-2 py-1.5">
                  <input
                    className={`input text-sm py-1 ${errors[`${rowIndex}.unitNumber`] ? 'border-red-300' : ''}`}
                    value={unit.unitNumber}
                    placeholder="W-01"
                    onChange={(e) => updateUnit(rowIndex, 'unitNumber', e.target.value)}
                    onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 0)}
                  />
                </td>

                {/* Unit type */}
                <td className="px-2 py-1.5">
                  <select
                    className="input text-sm py-1"
                    value={unit.unitType}
                    onChange={(e) => updateUnit(rowIndex, 'unitType', e.target.value as UnitType)}
                    onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 1)}
                  >
                    {UNIT_TYPES.map((t) => (
                      <option key={t} value={t}>{UNIT_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </td>

                {/* Building dropdown */}
                <td className="px-2 py-1.5">
                  <select
                    className={`input text-sm py-1 ${errors[`${rowIndex}.buildingId`] ? 'border-red-300' : ''}`}
                    value={unit.buildingId}
                    onChange={(e) => updateUnit(rowIndex, 'buildingId', e.target.value)}
                    onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 2)}
                  >
                    <option value="">Select</option>
                    {state.savedBuildings.map((b, i) => (
                      <option key={b.id} value={b.id}>
                        {b.street} {b.houseNumber} (Bldg {i + 1})
                      </option>
                    ))}
                  </select>
                </td>

                {/* Floor */}
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    className="input text-sm py-1"
                    value={unit.floor}
                    placeholder="0"
                    onChange={(e) => updateUnit(rowIndex, 'floor', e.target.value)}
                    onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 3)}
                  />
                </td>

                {/* Entrance */}
                <td className="px-2 py-1.5">
                  <input
                    className="input text-sm py-1"
                    value={unit.entrance}
                    placeholder="A"
                    onChange={(e) => updateUnit(rowIndex, 'entrance', e.target.value)}
                    onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 4)}
                  />
                </td>

                {/* Size */}
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    className={`input text-sm py-1 ${errors[`${rowIndex}.sizeSqm`] ? 'border-red-300' : ''}`}
                    value={unit.sizeSqm}
                    placeholder="68"
                    onChange={(e) => updateUnit(rowIndex, 'sizeSqm', e.target.value)}
                    onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 5)}
                  />
                </td>

                {/* Co-ownership share in per-mille */}
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    className={`input text-sm py-1 ${errors[`${rowIndex}.coOwnershipShare`] ? 'border-red-300' : ''}`}
                    value={unit.coOwnershipShare}
                    placeholder="43.2"
                    step="0.1"
                    onChange={(e) => updateUnit(rowIndex, 'coOwnershipShare', e.target.value)}
                    onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 6)}
                  />
                </td>

                {/* Construction year */}
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    className="input text-sm py-1"
                    value={unit.constructionYear}
                    placeholder="1987"
                    onChange={(e) => updateUnit(rowIndex, 'constructionYear', e.target.value)}
                    onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 7)}
                  />
                </td>

                {/* Rooms */}
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    className="input text-sm py-1"
                    value={unit.rooms}
                    placeholder="3"
                    onChange={(e) => updateUnit(rowIndex, 'rooms', e.target.value)}
                    onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 8)}
                  />
                </td>

                {/* Clone + delete */}
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Clone row"
                      onClick={() => cloneRow(rowIndex)}
                      className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      title="Delete row"
                      onClick={() => deleteRow(rowIndex)}
                      disabled={units.length === 1}
                      className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add row button */}
      <button
        type="button"
        onClick={addRow}
        className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-blue-300 hover:text-blue-500 transition-colors"
      >
        + Add unit
      </button>

      {/* Co-ownership share total */}
      <div className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg ${
        shareOk
          ? 'bg-green-50 text-green-700'
          : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
      }`}>
        <span>Co-ownership shares total</span>
        <span className="font-mono font-medium">
          {shareTotal.toFixed(1)} / 1000
          {shareOk ? ' ✓' : ' — expected 1000'}
        </span>
      </div>

      {shareWarning && (
        <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-3 py-2 rounded-lg">
          {shareWarning}
        </p>
      )}

      {errors.submit && (
        <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
          {errors.submit}
        </p>
      )}

      <div className="flex justify-between pt-2 border-t border-gray-100">
        <button
          className="btn-secondary"
          onClick={() => dispatch({ type: 'PREV_STEP' })}
        >
          Back
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {units.filter(u => u.unitNumber).length} units
          </span>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Create property'}
          </button>
        </div>
      </div>
    </div>
  )
}

function incrementUnitNumber(unitNumber: string): string {
  const match = unitNumber.match(/^(.*?)(\d+)$/)
  if (!match) return `${unitNumber}-copy`
  const prefix = match[1]
  const num    = parseInt(match[2], 10)
  return `${prefix}${num + 1}`
}