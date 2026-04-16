'use client'

import { useState } from 'react'
import { useWizard } from '@/context/WizardContext'
import { upsertBuildings } from '@/lib/api'
import type { BuildingFormData } from '@/context/WizardContext'

export function Step2Buildings() {
  const { state, dispatch } = useWizard()

  const [buildings,  setBuildings]  = useState<BuildingFormData[]>(state.buildings)
  const [errors,     setErrors]     = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  function updateBuilding(index: number, field: keyof BuildingFormData, value: string) {
    setBuildings((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)),
    )
  }

  function addBuilding() {
    setBuildings((prev) => [
      ...prev,
      { street: '', houseNumber: '', postalCode: '', city: '' },
    ])
  }

  function removeBuilding(index: number) {
    if (buildings.length === 1) return
    setBuildings((prev) => prev.filter((_, i) => i !== index))
  }

  function validate() {
    const e: Record<string, string> = {}
    buildings.forEach((b, i) => {
      if (!b.street.trim())      e[`${i}.street`]      = 'Required'
      if (!b.houseNumber.trim()) e[`${i}.houseNumber`]  = 'Required'
      if (!b.postalCode.trim())  e[`${i}.postalCode`]   = 'Required'
      if (!b.city.trim())        e[`${i}.city`]         = 'Required'
    })
    return e
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
      const saved = await upsertBuildings(state.propertyId, buildings)

      dispatch({ type: 'SET_BUILDINGS',       data: buildings })
      dispatch({ type: 'SET_SAVED_BUILDINGS', buildings: saved })
      dispatch({ type: 'AUTO_ASSIGN_BUILDINGS', savedBuildings: saved }) 
      dispatch({ type: 'NEXT_STEP' })
    } catch (err: any) {
      const msg = err?.response?.data?.message
      setErrors({ submit: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Something went wrong' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      {state.aiPrefilled && buildings.some(b => b.street) && (
        <div className="bg-purple-50 border border-purple-100 rounded-lg px-3 py-2 text-xs text-purple-700">
          <span className="font-medium">AI pre-filled</span> — review the building details below before continuing.
        </div>
      )}

      {buildings.map((building, index) => (
        <div key={index} className="border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">
              Building {index + 1}
            </h3>
            {buildings.length > 1 && (
              <button
                type="button"
                onClick={() => removeBuilding(index)}
                className="text-xs text-red-400 hover:text-red-600 transition-colors"
              >
                Remove
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Street</label>
              <input
                className={`input text-sm ${state.aiPrefilled && building.street ? 'ai-prefilled' : ''} ${errors[`${index}.street`] ? 'border-red-300' : ''}`}
                placeholder="Musterstraße"
                value={building.street}
                onChange={(e) => updateBuilding(index, 'street', e.target.value)}
              />
              {errors[`${index}.street`] && (
                <p className="mt-0.5 text-xs text-red-500">{errors[`${index}.street`]}</p>
              )}
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Number</label>
              <input
                className={`input text-sm ${state.aiPrefilled && building.houseNumber ? 'ai-prefilled' : ''} ${errors[`${index}.houseNumber`] ? 'border-red-300' : ''}`}
                placeholder="12a"
                value={building.houseNumber}
                onChange={(e) => updateBuilding(index, 'houseNumber', e.target.value)}
              />
              {errors[`${index}.houseNumber`] && (
                <p className="mt-0.5 text-xs text-red-500">{errors[`${index}.houseNumber`]}</p>
              )}
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Postal code</label>
              <input
                className={`input text-sm ${state.aiPrefilled && building.postalCode ? 'ai-prefilled' : ''} ${errors[`${index}.postalCode`] ? 'border-red-300' : ''}`}
                placeholder="10115"
                value={building.postalCode}
                onChange={(e) => updateBuilding(index, 'postalCode', e.target.value)}
              />
              {errors[`${index}.postalCode`] && (
                <p className="mt-0.5 text-xs text-red-500">{errors[`${index}.postalCode`]}</p>
              )}
            </div>

            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">City</label>
              <input
                className={`input text-sm ${state.aiPrefilled && building.city ? 'ai-prefilled' : ''} ${errors[`${index}.city`] ? 'border-red-300' : ''}`}
                placeholder="Berlin"
                value={building.city}
                onChange={(e) => updateBuilding(index, 'city', e.target.value)}
              />
              {errors[`${index}.city`] && (
                <p className="mt-0.5 text-xs text-red-500">{errors[`${index}.city`]}</p>
              )}
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addBuilding}
        className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-blue-300 hover:text-blue-500 transition-colors"
      >
        + Add another building
      </button>

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
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Saving...' : 'Next — Units'}
        </button>
      </div>
    </div>
  )
}