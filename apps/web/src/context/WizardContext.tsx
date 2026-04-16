'use client'

import React, { createContext, useContext, useReducer } from 'react'
import type { PropertyType, UnitType, AiExtraction, Building } from '@/lib/api'

// ─────────────────────────────────────────────────────────
// Shape of data each step collects
// ─────────────────────────────────────────────────────────

export interface GeneralInfoData {
  name:         string
  type:         PropertyType
  managerId:    string
  accountantId: string
}

export interface BuildingFormData {
  street:      string
  houseNumber: string
  postalCode:  string
  city:        string
}

export interface UnitFormData {
  id:               string
  unitNumber:       string
  unitType:         UnitType
  buildingId:       string
  buildingReference?: string | null   // e.g. "Haus A" — from AI extraction, used for auto-assign
  floor:            number | ''
  entrance:         string
  sizeSqm:          number | ''
  coOwnershipShare: number | ''
  constructionYear: number | ''
  rooms:            number | ''
}

// ─────────────────────────────────────────────────────────
// Full wizard state
// ─────────────────────────────────────────────────────────

interface WizardState {
  step:           1 | 2 | 3
  propertyId:     string | null
  savedBuildings: Building[]
  generalInfo:    GeneralInfoData | null
  buildings:      BuildingFormData[]
  units:          UnitFormData[]
  aiPrefilled:    boolean
}

const initialState: WizardState = {
  step:           1,
  propertyId:     null,
  savedBuildings: [],
  generalInfo:    null,
  buildings:      [{ street: '', houseNumber: '', postalCode: '', city: '' }],
  units:          [makeEmptyUnit()],
  aiPrefilled:    false,
}

// ─────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────

type WizardAction =
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SET_PROPERTY_ID';       propertyId: string }
  | { type: 'SET_SAVED_BUILDINGS';   buildings: Building[] }
  | { type: 'SET_GENERAL_INFO';      data: GeneralInfoData }
  | { type: 'SET_BUILDINGS';         data: BuildingFormData[] }
  | { type: 'SET_UNITS';             data: UnitFormData[] }
  | { type: 'PREFILL_FROM_AI';       data: AiExtraction }
  | { type: 'AUTO_ASSIGN_BUILDINGS'; savedBuildings: Building[] }
  | { type: 'RESET' }

// ─────────────────────────────────────────────────────────
// Reducer
// ─────────────────────────────────────────────────────────

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'NEXT_STEP':
      return { ...state, step: Math.min(state.step + 1, 3) as 1 | 2 | 3 }

    case 'PREV_STEP':
      return { ...state, step: Math.max(state.step - 1, 1) as 1 | 2 | 3 }

    case 'SET_PROPERTY_ID':
      return { ...state, propertyId: action.propertyId }

    case 'SET_SAVED_BUILDINGS':
      return { ...state, savedBuildings: action.buildings }

    case 'SET_GENERAL_INFO':
      return { ...state, generalInfo: action.data }

    case 'SET_BUILDINGS':
      return { ...state, buildings: action.data }

    case 'SET_UNITS':
      return { ...state, units: action.data }

    case 'PREFILL_FROM_AI': {
      const { data } = action

      const buildings: BuildingFormData[] =
        data.buildings.length > 0
          ? data.buildings
          : state.buildings

      const units: UnitFormData[] =
        data.units.length > 0
          ? data.units.map((u, i) => ({
              id:               `ai-${i}`,
              unitNumber:       u.unitNumber ?? '',
              unitType:         u.unitType ?? 'APARTMENT',
              buildingId:       '',
              // Store the raw building reference from the document (e.g. "Haus A")
              // so AUTO_ASSIGN_BUILDINGS can match it to a real building UUID after step 2
              buildingReference: u.buildingReference ?? null,
              floor:            u.floor ?? '',
              entrance:         u.entrance ?? '',
              sizeSqm:          u.sizeSqm ?? '',
              // AI returns fractions (0.11) but the table shows per-mille (110.0)
              // so we multiply by 1000 here to match what the user expects to see
              coOwnershipShare: u.coOwnershipShare != null
                ? Math.round(u.coOwnershipShare * 1000 * 10) / 10
                : '',
              constructionYear: u.constructionYear ?? '',
              rooms:            u.rooms ?? '',
            }))
          : state.units

      return {
        ...state,
        buildings,
        units,
        aiPrefilled: data.buildings.length > 0 || data.units.length > 0,
        generalInfo: state.generalInfo && data.propertyName
          ? { ...state.generalInfo, name: data.propertyName }
          : state.generalInfo,
      }
    }

    case 'AUTO_ASSIGN_BUILDINGS': {
      const { savedBuildings } = action

      const updatedUnits = state.units.map(unit => {
        // Already has a building assigned — don't overwrite
        if (unit.buildingId) return unit

        if (!unit.buildingReference) {
          // No reference — assign to only building if there's just one
          return savedBuildings.length === 1
            ? { ...unit, buildingId: savedBuildings[0].id }
            : unit
        }

        const ref = unit.buildingReference.toLowerCase().trim()

        // Strategy 1: match by street name or house number in the reference
        const streetMatch = savedBuildings.find(b =>
          ref.includes(b.street.toLowerCase()) ||
          ref.includes(b.houseNumber.toLowerCase())
        )
        if (streetMatch) return { ...unit, buildingId: streetMatch.id }

        // Strategy 2: match Haus A/B/C by extracting the letter → index
        // "Haus A" → letter A → index 0 → first building
        // "Haus B" → letter B → index 1 → second building
        const hausLetterMatch = ref.match(/haus\s+([a-z])/i)
        if (hausLetterMatch) {
          const letter = hausLetterMatch[1].toUpperCase()
          const idx = letter.charCodeAt(0) - 'A'.charCodeAt(0)
          if (savedBuildings[idx]) return { ...unit, buildingId: savedBuildings[idx].id }
        }

        // Strategy 3: match Gebäude A/B/1/2 etc
        const gebäudeMatch = ref.match(/geb[äa]ude\s+([a-z0-9]+)/i)
        if (gebäudeMatch) {
          const label = gebäudeMatch[1].toUpperCase()
          const idx = isNaN(Number(label))
            ? label.charCodeAt(0) - 'A'.charCodeAt(0)
            : Number(label) - 1
          if (savedBuildings[idx]) return { ...unit, buildingId: savedBuildings[idx].id }
        }

        // Strategy 4: Tiefgarage / Außenanlage — assign to first building by default.
        // These are shared facilities that don't belong to a specific building
        // in the document, so we default to the first building administratively.
        if (
          ref.includes('tiefgarage') ||
          ref.includes('garage') ||
          ref.includes('außenanlage')
        ) {
          return { ...unit, buildingId: savedBuildings[0].id }
        }

        // Strategy 5: single building fallback
        if (savedBuildings.length === 1) {
          return { ...unit, buildingId: savedBuildings[0].id }
        }

        return unit
      })

      return { ...state, units: updatedUnits }
    }

    case 'RESET':
      return initialState

    default:
      return state
  }
}

// ─────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────

interface WizardContextValue {
  state:    WizardState
  dispatch: React.Dispatch<WizardAction>
}

const WizardContext = createContext<WizardContextValue | null>(null)

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(wizardReducer, initialState)
  return (
    <WizardContext.Provider value={{ state, dispatch }}>
      {children}
    </WizardContext.Provider>
  )
}

export function useWizard() {
  const ctx = useContext(WizardContext)
  if (!ctx) throw new Error('useWizard must be used inside WizardProvider')
  return ctx
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

export function makeEmptyUnit(): UnitFormData {
  return {
    id:               Math.random().toString(36).slice(2),
    unitNumber:       '',
    unitType:         'APARTMENT',
    buildingId:       '',
    buildingReference: null,
    floor:            '',
    entrance:         '',
    sizeSqm:          '',
    coOwnershipShare: '',
    constructionYear: '',
    rooms:            '',
  }
}