'use client'

import { useWizard } from '@/context/WizardContext'
import { Step1GeneralInfo } from './Step1GeneralInfo'
import { Step2Buildings } from './Step2Buildings'
import { Step3Units } from './Step3Units'
import { deleteProperty } from '@/lib/api'

interface WizardShellProps {
  onComplete: () => void
  onClose:    () => void
}

const STEPS = [
  { number: 1, label: 'General info' },
  { number: 2, label: 'Buildings'    },
  { number: 3, label: 'Units'        },
]

export function WizardShell({ onComplete, onClose }: WizardShellProps) {
  const { state } = useWizard()

  function stepLabel(stepNumber: number): string {
    if (stepNumber === 2 && state.buildings.filter(b => b.street).length > 0) {
      return `Buildings (${state.buildings.filter(b => b.street).length})`
    }
    if (stepNumber === 3 && state.units.filter(u => u.unitNumber).length > 0) {
      return `Units (${state.units.filter(u => u.unitNumber).length})`
    }
    return STEPS[stepNumber - 1].label
  }

  // If the user closes the wizard after step 1 has already saved a property
  // to the backend, we clean it up so the dashboard doesn't show half-created
  // properties. If they're on step 1 still, nothing has been saved yet.
  async function handleClose() {
    if (state.propertyId) {
      try {
        await deleteProperty(state.propertyId)
      } catch {
        // Silently ignore — worst case a partial property stays in the DB
        // The user can delete it from the dashboard later
      }
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl mx-4">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Create new property
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step progress bar */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center gap-0">
            {STEPS.map((step, index) => {
              const isCompleted = state.step > step.number
              const isActive    = state.step === step.number

              return (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                        isCompleted || isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {isCompleted ? (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        step.number
                      )}
                    </div>
                    <span
                      className={`text-sm transition-colors ${
                        isActive ? 'text-blue-600 font-medium' : 'text-gray-400'
                      }`}
                    >
                      {stepLabel(step.number)}
                    </span>
                  </div>

                  {index < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-px mx-3 transition-colors ${
                        state.step > step.number ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="px-6 py-4">
          {state.step === 1 && <Step1GeneralInfo />}
          {state.step === 2 && <Step2Buildings />}
          {state.step === 3 && <Step3Units onComplete={onComplete} />}
        </div>
      </div>
    </div>
  )
}