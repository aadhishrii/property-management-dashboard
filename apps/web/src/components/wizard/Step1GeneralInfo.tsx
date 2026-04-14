'use client'

import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useWizard } from '@/context/WizardContext'
import { fetchStaff, createProperty, uploadPdf } from '@/lib/api'
import type { PropertyType } from '@/lib/api'

export function Step1GeneralInfo() {
  const { state, dispatch } = useWizard()

  const [name,         setName]         = useState(state.generalInfo?.name         ?? '')
  const [type,         setType]         = useState<PropertyType>(state.generalInfo?.type ?? 'WEG')
  const [managerId,    setManagerId]    = useState(state.generalInfo?.managerId    ?? '')
  const [accountantId, setAccountantId] = useState(state.generalInfo?.accountantId ?? '')
  const [errors,       setErrors]       = useState<Record<string, string>>({})
  const [submitting,   setSubmitting]   = useState(false)

  const [pdfFile,       setPdfFile]       = useState<File | null>(null)
  const [extracting,    setExtracting]    = useState(false)
  const [extractNotice, setExtractNotice] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: staff } = useQuery({
    queryKey: ['staff'],
    queryFn:  fetchStaff,
  })

  async function handlePdfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setPdfFile(file)
    setExtracting(true)
    setExtractNotice(null)

    try {
      const extracted = await uploadPdf(file)
      dispatch({ type: 'PREFILL_FROM_AI', data: extracted })

      if (extracted.propertyName) {
        setName(extracted.propertyName)
      }

      const buildingCount = extracted.buildings.length
      const unitCount     = extracted.units.length

      if (buildingCount > 0 || unitCount > 0) {
        setExtractNotice(
          `Pre-filled ${buildingCount} building${buildingCount !== 1 ? 's' : ''} and ${unitCount} unit${unitCount !== 1 ? 's' : ''} from your PDF. Review and edit before confirming.`,
        )
      } else {
        setExtractNotice('PDF uploaded. No structured data could be extracted — you can fill in the details manually.')
      }
    } catch {
      setExtractNotice('Could not extract data from this PDF. You can continue filling in the details manually.')
    } finally {
      setExtracting(false)
    }
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim())  e.name         = 'Property name is required'
    if (!managerId)    e.managerId    = 'Please assign a manager'
    if (!accountantId) e.accountantId = 'Please assign an accountant'
    return e
  }

  async function handleSubmit() {
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSubmitting(true)
    setErrors({})

    try {
      const property = await createProperty({ name, type, managerId, accountantId })

      dispatch({ type: 'SET_GENERAL_INFO', data: { name, type, managerId, accountantId } })
      dispatch({ type: 'SET_PROPERTY_ID',  propertyId: property.id })
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

      {/* PDF upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Teilungserklärung
          <span className="ml-1 font-normal text-gray-400">(optional — pre-fills buildings and units)</span>
        </label>

        <div
          className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {extracting ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-blue-600">Extracting data from PDF...</p>
            </div>
          ) : pdfFile ? (
            <div className="flex flex-col items-center gap-1">
              <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-gray-700">{pdfFile.name}</p>
              <p className="text-xs text-gray-400">Click to replace</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-gray-500">Upload PDF to auto-fill</p>
              <p className="text-xs text-gray-400">PDF up to 20MB</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handlePdfChange}
          />
        </div>

        {extractNotice && (
          <div className={`mt-2 text-xs px-3 py-2 rounded-lg ${
            state.aiPrefilled
              ? 'bg-purple-50 text-purple-700 border border-purple-100'
              : 'bg-gray-50 text-gray-500'
          }`}>
            {state.aiPrefilled && (
              <span className="font-medium mr-1">AI pre-filled —</span>
            )}
            {extractNotice}
          </div>
        )}
      </div>

      {/* WEG / MV toggle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Management type
        </label>
        <div className="flex gap-2">
          {(['WEG', 'MV'] as PropertyType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                type === t
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
              }`}
            >
              {t === 'WEG' ? 'WEG — Community of owners' : 'MV — Rental management'}
            </button>
          ))}
        </div>
      </div>

      {/* Property name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Property name
        </label>
        <input
          className={`input ${state.aiPrefilled && name ? 'ai-prefilled' : ''} ${errors.name ? 'border-red-300 focus:ring-red-400' : ''}`}
          placeholder="e.g. Musterstraße Residenz"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
      </div>

      {/* Manager dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Property manager
        </label>
        <select
          className={`input ${errors.managerId ? 'border-red-300' : ''}`}
          value={managerId}
          onChange={(e) => setManagerId(e.target.value)}
        >
          <option value="">Select a manager</option>
          {staff?.managers.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        {errors.managerId && <p className="mt-1 text-xs text-red-500">{errors.managerId}</p>}
      </div>

      {/* Accountant dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Accountant
        </label>
        <select
          className={`input ${errors.accountantId ? 'border-red-300' : ''}`}
          value={accountantId}
          onChange={(e) => setAccountantId(e.target.value)}
        >
          <option value="">Select an accountant</option>
          {staff?.accountants.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        {errors.accountantId && <p className="mt-1 text-xs text-red-500">{errors.accountantId}</p>}
      </div>

      {errors.submit && (
        <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
          {errors.submit}
        </p>
      )}

      <div className="flex justify-end pt-2 border-t border-gray-100">
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Saving...' : 'Next — Buildings'}
        </button>
      </div>
    </div>
  )
}