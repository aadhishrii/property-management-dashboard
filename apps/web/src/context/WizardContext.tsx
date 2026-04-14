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
  | { type: 'SET_PROPERTY_ID';     propertyId: string }
  | { type: 'SET_SAVED_BUILDINGS'; buildings: Building[] }
  | { type: 'SET_GENERAL_INFO';    data: GeneralInfoData }
  | { type: 'SET_BUILDINGS';       data: BuildingFormData[] }
  | { type: 'SET_UNITS';           data: UnitFormData[] }
  | { type: 'PREFILL_FROM_AI';     data: AiExtraction }
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
    floor:            '',
    entrance:         '',
    sizeSqm:          '',
    coOwnershipShare: '',
    constructionYear: '',
    rooms:            '',
  }
}