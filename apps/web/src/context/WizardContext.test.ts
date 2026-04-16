import { wizardReducer, makeEmptyUnit } from './WizardContext'
import type { BuildingFormData } from './WizardContext'

// wizardReducer is a pure function — state + action → new state.
// No React rendering, no HTTP, no database. Pure input/output testing.
// This is the easiest and most valuable kind of test to write because
// the wizard state is the backbone of the entire creation flow.

describe('wizardReducer', () => {

  const baseState = {
    step:           1 as const,
    propertyId:     null,
    savedBuildings: [],
    generalInfo:    null,
    buildings:      [{ street: '', houseNumber: '', postalCode: '', city: '' }],
    units:          [makeEmptyUnit()],
    aiPrefilled:    false,
  }

  // ── NEXT_STEP ───────────────────────────────────────────

  describe('NEXT_STEP', () => {
    it('advances from step 1 to 2', () => {
      const result = wizardReducer(baseState, { type: 'NEXT_STEP' })
      expect(result.step).toBe(2)
    })

    it('advances from step 2 to 3', () => {
      const state  = { ...baseState, step: 2 as const }
      const result = wizardReducer(state, { type: 'NEXT_STEP' })
      expect(result.step).toBe(3)
    })

    it('does not advance past step 3', () => {
      const state  = { ...baseState, step: 3 as const }
      const result = wizardReducer(state, { type: 'NEXT_STEP' })
      expect(result.step).toBe(3)
    })

    it('does not clear propertyId when advancing', () => {
      const state  = { ...baseState, propertyId: 'abc-123' }
      const result = wizardReducer(state, { type: 'NEXT_STEP' })
      expect(result.propertyId).toBe('abc-123')
    })

    it('does not clear aiPrefilled when advancing', () => {
      const state  = { ...baseState, aiPrefilled: true }
      const result = wizardReducer(state, { type: 'NEXT_STEP' })
      expect(result.aiPrefilled).toBe(true)
    })

    it('does not clear buildings when advancing', () => {
      const state = {
        ...baseState,
        buildings: [{ street: 'Musterstraße', houseNumber: '12', postalCode: '10115', city: 'Berlin' }],
      }
      const result = wizardReducer(state, { type: 'NEXT_STEP' })
      expect(result.buildings[0].street).toBe('Musterstraße')
    })
  })

  // ── PREV_STEP ───────────────────────────────────────────

  describe('PREV_STEP', () => {
    it('goes back from step 2 to 1', () => {
      const state  = { ...baseState, step: 2 as const }
      const result = wizardReducer(state, { type: 'PREV_STEP' })
      expect(result.step).toBe(1)
    })

    it('goes back from step 3 to 2', () => {
      const state  = { ...baseState, step: 3 as const }
      const result = wizardReducer(state, { type: 'PREV_STEP' })
      expect(result.step).toBe(2)
    })

    it('does not go below step 1', () => {
      const result = wizardReducer(baseState, { type: 'PREV_STEP' })
      expect(result.step).toBe(1)
    })

    it('preserves aiPrefilled when going back', () => {
      const state  = { ...baseState, step: 2 as const, aiPrefilled: true }
      const result = wizardReducer(state, { type: 'PREV_STEP' })
      expect(result.aiPrefilled).toBe(true)
    })

    it('preserves generalInfo when going back', () => {
      const state = {
        ...baseState,
        step:        2 as const,
        generalInfo: { name: 'Test', type: 'WEG' as const, managerId: 'm-1', accountantId: 'a-1' },
      }
      const result = wizardReducer(state, { type: 'PREV_STEP' })
      expect(result.generalInfo?.name).toBe('Test')
    })
  })

  // ── SET_PROPERTY_ID ─────────────────────────────────────

  describe('SET_PROPERTY_ID', () => {
    it('stores the property id returned from backend', () => {
      const result = wizardReducer(baseState, {
        type:       'SET_PROPERTY_ID',
        propertyId: 'fa1c81c8-56bb-4944-9e72-6b025a721d9d',
      })
      expect(result.propertyId).toBe('fa1c81c8-56bb-4944-9e72-6b025a721d9d')
    })

    it('does not change the current step', () => {
      const result = wizardReducer(baseState, {
        type:       'SET_PROPERTY_ID',
        propertyId: 'abc-123',
      })
      expect(result.step).toBe(1)
    })

    it('does not affect other state', () => {
      const result = wizardReducer(baseState, {
        type:       'SET_PROPERTY_ID',
        propertyId: 'abc-123',
      })
      expect(result.aiPrefilled).toBe(false)
      expect(result.generalInfo).toBeNull()
    })
  })

  // ── SET_SAVED_BUILDINGS ─────────────────────────────────

  describe('SET_SAVED_BUILDINGS', () => {
    it('stores real building records from backend', () => {
      const buildings = [
        { id: 'db-id-1', propertyId: 'p-1', street: 'Musterstraße',
          houseNumber: '12', postalCode: '10115', city: 'Berlin' },
      ]
      const result = wizardReducer(baseState, {
        type:      'SET_SAVED_BUILDINGS',
        buildings,
      })
      expect(result.savedBuildings).toHaveLength(1)
      expect(result.savedBuildings[0].id).toBe('db-id-1')
    })

    it('stores multiple buildings', () => {
      const buildings = [
        { id: 'b-1', propertyId: 'p-1', street: 'Am Fiktivpark',
          houseNumber: '12', postalCode: '10557', city: 'Berlin' },
        { id: 'b-2', propertyId: 'p-1', street: 'Urbanstraße',
          houseNumber: '88', postalCode: '10557', city: 'Berlin' },
      ]
      const result = wizardReducer(baseState, {
        type:      'SET_SAVED_BUILDINGS',
        buildings,
      })
      expect(result.savedBuildings).toHaveLength(2)
    })

    it('replaces previously saved buildings', () => {
      const state = {
        ...baseState,
        savedBuildings: [
          { id: 'old-id', propertyId: 'p-1', street: 'Old Street',
            houseNumber: '1', postalCode: '10000', city: 'Berlin' },
        ],
      }
      const result = wizardReducer(state, {
        type:      'SET_SAVED_BUILDINGS',
        buildings: [
          { id: 'new-id', propertyId: 'p-1', street: 'New Street',
            houseNumber: '2', postalCode: '10001', city: 'Berlin' },
        ],
      })
      expect(result.savedBuildings).toHaveLength(1)
      expect(result.savedBuildings[0].id).toBe('new-id')
    })
  })

  // ── SET_GENERAL_INFO ────────────────────────────────────

  describe('SET_GENERAL_INFO', () => {
    it('stores all general info fields', () => {
      const data = {
        name:         'Parkview Residences Berlin',
        type:         'WEG' as const,
        managerId:    'mgr-id-1',
        accountantId: 'acc-id-1',
      }
      const result = wizardReducer(baseState, { type: 'SET_GENERAL_INFO', data })
      expect(result.generalInfo).toEqual(data)
    })

    it('stores MV type correctly', () => {
      const data = {
        name:         'Miethaus Berlin',
        type:         'MV' as const,
        managerId:    'mgr-id-1',
        accountantId: 'acc-id-1',
      }
      const result = wizardReducer(baseState, { type: 'SET_GENERAL_INFO', data })
      expect(result.generalInfo?.type).toBe('MV')
    })
  })

  // ── SET_BUILDINGS ───────────────────────────────────────

  describe('SET_BUILDINGS', () => {
    it('replaces building form data', () => {
      const buildings: BuildingFormData[] = [
        { street: 'Musterstraße', houseNumber: '12', postalCode: '10115', city: 'Berlin' },
      ]
      const result = wizardReducer(baseState, { type: 'SET_BUILDINGS', data: buildings })
      expect(result.buildings).toHaveLength(1)
      expect(result.buildings[0].street).toBe('Musterstraße')
    })

    it('can store multiple buildings', () => {
      const buildings: BuildingFormData[] = [
        { street: 'Am Fiktivpark', houseNumber: '12', postalCode: '10557', city: 'Berlin' },
        { street: 'Urbanstraße',   houseNumber: '88', postalCode: '10557', city: 'Berlin' },
      ]
      const result = wizardReducer(baseState, { type: 'SET_BUILDINGS', data: buildings })
      expect(result.buildings).toHaveLength(2)
    })
  })

  // ── SET_UNITS ───────────────────────────────────────────

  describe('SET_UNITS', () => {
    it('replaces unit form data', () => {
      const unit    = makeEmptyUnit()
      unit.unitNumber = 'W-01'
      const result = wizardReducer(baseState, { type: 'SET_UNITS', data: [unit] })
      expect(result.units[0].unitNumber).toBe('W-01')
    })

    it('can store many units', () => {
      const units = Array.from({ length: 14 }, (_, i) => {
        const u      = makeEmptyUnit()
        u.unitNumber = String(i + 1).padStart(2, '0')
        return u
      })
      const result = wizardReducer(baseState, { type: 'SET_UNITS', data: units })
      expect(result.units).toHaveLength(14)
    })
  })

  // ── PREFILL_FROM_AI ─────────────────────────────────────

  describe('PREFILL_FROM_AI', () => {

    // helper to create a minimal AI unit
    const makeAiUnit = (overrides = {}) => ({
      unitNumber:        '01',
      unitType:          'APARTMENT' as const,
      buildingReference: null,
      floor:             0,
      entrance:          'A',
      sizeSqm:           95,
      coOwnershipShare:  0.11,
      constructionYear:  2023,
      rooms:             3,
      ...overrides,
    })

    // Buildings
    it('populates buildings from extraction', () => {
      const result = wizardReducer(baseState, {
        type: 'PREFILL_FROM_AI',
        data: {
          propertyName: 'Parkview',
          buildings: [{
            street: 'Am Fiktivpark', houseNumber: '12',
            postalCode: '10557', city: 'Berlin',
          }],
          units: [],
        },
      })
      expect(result.buildings).toHaveLength(1)
      expect(result.buildings[0].street).toBe('Am Fiktivpark')
    })

    it('keeps existing buildings when extraction returns empty', () => {
      const state = {
        ...baseState,
        buildings: [{ street: 'Existing', houseNumber: '1', postalCode: '10115', city: 'Berlin' }],
      }
      const result = wizardReducer(state, {
        type: 'PREFILL_FROM_AI',
        data: { propertyName: null, buildings: [], units: [] },
      })
      expect(result.buildings[0].street).toBe('Existing')
    })

    it('populates both buildings from the Parkview PDF', () => {
      const result = wizardReducer(baseState, {
        type: 'PREFILL_FROM_AI',
        data: {
          propertyName: 'Parkview Residences Berlin',
          buildings: [
            { street: 'Am Fiktivpark', houseNumber: '12', postalCode: '10557', city: 'Berlin' },
            { street: 'Urbanstraße',   houseNumber: '88', postalCode: '10557', city: 'Berlin' },
          ],
          units: [],
        },
      })
      expect(result.buildings).toHaveLength(2)
      expect(result.buildings[1].street).toBe('Urbanstraße')
    })

    // Units
    it('populates units from extraction', () => {
      const result = wizardReducer(baseState, {
        type: 'PREFILL_FROM_AI',
        data: { propertyName: null, buildings: [], units: [makeAiUnit()] },
      })
      expect(result.units).toHaveLength(1)
      expect(result.units[0].unitNumber).toBe('01')
    })

    it('sets buildingId to empty string for all pre-filled units', () => {
      const result = wizardReducer(baseState, {
        type: 'PREFILL_FROM_AI',
        data: { propertyName: null, buildings: [], units: [makeAiUnit()] },
      })
      expect(result.units[0].buildingId).toBe('')
    })

    it('stores buildingReference from AI extraction', () => {
      const result = wizardReducer(baseState, {
        type: 'PREFILL_FROM_AI',
        data: {
          propertyName: null,
          buildings:    [],
          units: [makeAiUnit({ buildingReference: 'Am Fiktivpark 12' })],
        },
      })
      expect(result.units[0].buildingReference).toBe('Am Fiktivpark 12')
    })

    // coOwnershipShare conversion — the most important pre-fill test
    it('converts coOwnershipShare from fraction to per-mille for display', () => {
      const result = wizardReducer(baseState, {
        type: 'PREFILL_FROM_AI',
        data: { propertyName: null, buildings: [], units: [makeAiUnit({ coOwnershipShare: 0.11 })] },
      })
      expect(result.units[0].coOwnershipShare).toBe(110)
    })

    it('handles all 14 units from the Parkview PDF', () => {
      const result = wizardReducer(baseState, {
        type: 'PREFILL_FROM_AI',
        data: {
          propertyName: 'Parkview Residences Berlin',
          buildings:    [],
          units: [
            makeAiUnit({ unitNumber: '01', unitType: 'APARTMENT', buildingReference: 'Am Fiktivpark 12', floor: 0,  entrance: 'A', sizeSqm: 95,   coOwnershipShare: 0.110, rooms: 3 }),
            makeAiUnit({ unitNumber: '02', unitType: 'APARTMENT', buildingReference: 'Am Fiktivpark 12', floor: 0,  entrance: 'A', sizeSqm: 92.5, coOwnershipShare: 0.108, rooms: 3 }),
            makeAiUnit({ unitNumber: '03', unitType: 'APARTMENT', buildingReference: 'Am Fiktivpark 12', floor: 1,  entrance: 'A', sizeSqm: 105,  coOwnershipShare: 0.120, rooms: 4 }),
            makeAiUnit({ unitNumber: '04', unitType: 'APARTMENT', buildingReference: 'Am Fiktivpark 12', floor: 2,  entrance: 'A', sizeSqm: 78,   coOwnershipShare: 0.090, rooms: 2 }),
            makeAiUnit({ unitNumber: '05', unitType: 'APARTMENT', buildingReference: 'Am Fiktivpark 12', floor: 4,  entrance: 'A', sizeSqm: 145,  coOwnershipShare: 0.160, rooms: 4 }),
            makeAiUnit({ unitNumber: '06', unitType: 'OFFICE',    buildingReference: 'Urbanstraße 88',   floor: 0,  entrance: 'B', sizeSqm: 110,  coOwnershipShare: 0.125, rooms: null }),
            makeAiUnit({ unitNumber: '07', unitType: 'APARTMENT', buildingReference: 'Urbanstraße 88',   floor: 1,  entrance: 'B', sizeSqm: 65,   coOwnershipShare: 0.075, rooms: 2 }),
            makeAiUnit({ unitNumber: '08', unitType: 'APARTMENT', buildingReference: 'Urbanstraße 88',   floor: 2,  entrance: 'B', sizeSqm: 88,   coOwnershipShare: 0.102, rooms: 3 }),
            makeAiUnit({ unitNumber: '09', unitType: 'PARKING',   buildingReference: null,               floor: -1, entrance: null, sizeSqm: 12.5, coOwnershipShare: 0.001, rooms: null }),
            makeAiUnit({ unitNumber: '10', unitType: 'PARKING',   buildingReference: null,               floor: -1, entrance: null, sizeSqm: 12.5, coOwnershipShare: 0.001, rooms: null }),
            makeAiUnit({ unitNumber: '11', unitType: 'PARKING',   buildingReference: null,               floor: -1, entrance: null, sizeSqm: 12.5, coOwnershipShare: 0.001, rooms: null }),
            makeAiUnit({ unitNumber: '12', unitType: 'PARKING',   buildingReference: null,               floor: -1, entrance: null, sizeSqm: 12.5, coOwnershipShare: 0.001, rooms: null }),
            makeAiUnit({ unitNumber: '13', unitType: 'PARKING',   buildingReference: null,               floor: -1, entrance: null, sizeSqm: 12.5, coOwnershipShare: 0.001, rooms: null }),
            makeAiUnit({ unitNumber: '14', unitType: 'GARDEN',    buildingReference: null,               floor: 0,  entrance: null, sizeSqm: 40,   coOwnershipShare: 0.005, rooms: null }),
          ],
        },
      })
      expect(result.units).toHaveLength(14)
      expect(result.units[5].unitType).toBe('OFFICE')
      expect(result.units[8].unitType).toBe('PARKING')
      expect(result.units[13].unitType).toBe('GARDEN')
    })

    // null/undefined field handling
    it('handles null entrance gracefully', () => {
      const result = wizardReducer(baseState, {
        type: 'PREFILL_FROM_AI',
        data: {
          propertyName: null, buildings: [],
          units: [makeAiUnit({ unitType: 'PARKING', floor: -1, entrance: null, sizeSqm: 12.5, coOwnershipShare: 0.001, rooms: null })],
        },
      })
      expect(result.units[0].entrance).toBe('')
    })

    it('handles null rooms gracefully', () => {
      const result = wizardReducer(baseState, {
        type: 'PREFILL_FROM_AI',
        data: {
          propertyName: null, buildings: [],
          units: [makeAiUnit({ unitType: 'OFFICE', rooms: null })],
        },
      })
      expect(result.units[0].rooms).toBe('')
    })

    it('handles null coOwnershipShare gracefully', () => {
      const result = wizardReducer(baseState, {
        type: 'PREFILL_FROM_AI',
        data: {
          propertyName: null, buildings: [],
          units: [makeAiUnit({ coOwnershipShare: null as any })],
        },
      })
      expect(result.units[0].coOwnershipShare).toBe('')
    })

    it('handles null buildingReference gracefully', () => {
      const result = wizardReducer(baseState, {
        type: 'PREFILL_FROM_AI',
        data: {
          propertyName: null, buildings: [],
          units: [makeAiUnit({ buildingReference: null })],
        },
      })
      expect(result.units[0].buildingReference).toBeNull()
    })

    // aiPrefilled flag
    it('sets aiPrefilled to true when buildings extracted', () => {
      const result = wizardReducer(baseState, {
        type: 'PREFILL_FROM_AI',
        data: {
          propertyName: null,
          buildings:    [{ street: 'Test', houseNumber: '1', postalCode: '10115', city: 'Berlin' }],
          units:        [],
        },
      })
      expect(result.aiPrefilled).toBe(true)
    })

    it('sets aiPrefilled to true when units extracted', () => {
      const result = wizardReducer(baseState, {
        type: 'PREFILL_FROM_AI',
        data: { propertyName: null, buildings: [], units: [makeAiUnit()] },
      })
      expect(result.aiPrefilled).toBe(true)
    })

    it('sets aiPrefilled to false when nothing extracted', () => {
      const result = wizardReducer(baseState, {
        type: 'PREFILL_FROM_AI',
        data: { propertyName: null, buildings: [], units: [] },
      })
      expect(result.aiPrefilled).toBe(false)
    })

    // propertyName in generalInfo
    it('updates generalInfo name when propertyName extracted and generalInfo exists', () => {
      const state = {
        ...baseState,
        generalInfo: { name: '', type: 'WEG' as const, managerId: 'm-1', accountantId: 'a-1' },
      }
      const result = wizardReducer(state, {
        type: 'PREFILL_FROM_AI',
        data: { propertyName: 'Parkview Residences Berlin', buildings: [], units: [] },
      })
      expect(result.generalInfo?.name).toBe('Parkview Residences Berlin')
    })

    it('does not update generalInfo when it is null', () => {
      const result = wizardReducer(baseState, {
        type: 'PREFILL_FROM_AI',
        data: { propertyName: 'Parkview', buildings: [], units: [] },
      })
      expect(result.generalInfo).toBeNull()
    })

    it('does not change generalInfo name when no propertyName extracted', () => {
      const state = {
        ...baseState,
        generalInfo: { name: 'Existing Name', type: 'WEG' as const, managerId: 'm-1', accountantId: 'a-1' },
      }
      const result = wizardReducer(state, {
        type: 'PREFILL_FROM_AI',
        data: { propertyName: null, buildings: [], units: [] },
      })
      expect(result.generalInfo?.name).toBe('Existing Name')
    })
  })

  // ── AUTO_ASSIGN_BUILDINGS ───────────────────────────────

  describe('AUTO_ASSIGN_BUILDINGS', () => {

    const savedBuildings = [
      { id: 'b-1', propertyId: 'p-1', street: 'Am Fiktivpark', houseNumber: '12', postalCode: '10557', city: 'Berlin' },
      { id: 'b-2', propertyId: 'p-1', street: 'Urbanstraße',   houseNumber: '88', postalCode: '10557', city: 'Berlin' },
    ]

    it('assigns buildingId when buildingReference matches street', () => {
      const state = {
        ...baseState,
        units: [{
          ...makeEmptyUnit(),
          buildingReference: 'Am Fiktivpark 12',
        }],
      }
      const result = wizardReducer(state, { type: 'AUTO_ASSIGN_BUILDINGS', savedBuildings })
      expect(result.units[0].buildingId).toBe('b-1')
    })

    it('assigns second building when reference matches its street', () => {
      const state = {
        ...baseState,
        units: [{
          ...makeEmptyUnit(),
          buildingReference: 'Urbanstraße 88',
        }],
      }
      const result = wizardReducer(state, { type: 'AUTO_ASSIGN_BUILDINGS', savedBuildings })
      expect(result.units[0].buildingId).toBe('b-2')
    })

    it('does not overwrite an already assigned buildingId', () => {
      const state = {
        ...baseState,
        units: [{
          ...makeEmptyUnit(),
          buildingId:        'b-2',
          buildingReference: 'Am Fiktivpark 12',
        }],
      }
      const result = wizardReducer(state, { type: 'AUTO_ASSIGN_BUILDINGS', savedBuildings })
      expect(result.units[0].buildingId).toBe('b-2')
    })

    it('assigns all units to the single building when there is only one', () => {
      const singleBuilding = [
        { id: 'b-1', propertyId: 'p-1', street: 'Musterstraße', houseNumber: '1', postalCode: '10115', city: 'Berlin' },
      ]
      const state = {
        ...baseState,
        units: [
          { ...makeEmptyUnit(), buildingReference: null },
          { ...makeEmptyUnit(), buildingReference: null },
        ],
      }
      const result = wizardReducer(state, { type: 'AUTO_ASSIGN_BUILDINGS', savedBuildings: singleBuilding })
      expect(result.units[0].buildingId).toBe('b-1')
      expect(result.units[1].buildingId).toBe('b-1')
    })

    it('leaves buildingId empty when no match and multiple buildings', () => {
      const state = {
        ...baseState,
        units: [{
          ...makeEmptyUnit(),
          buildingReference: null,
        }],
      }
      const result = wizardReducer(state, { type: 'AUTO_ASSIGN_BUILDINGS', savedBuildings })
      expect(result.units[0].buildingId).toBe('')
    })

    it('does not change other unit fields', () => {
      const unit = { ...makeEmptyUnit(), unitNumber: 'W-01', buildingReference: 'Am Fiktivpark 12' }
      const state = { ...baseState, units: [unit] }
      const result = wizardReducer(state, { type: 'AUTO_ASSIGN_BUILDINGS', savedBuildings })
      expect(result.units[0].unitNumber).toBe('W-01')
    })
  })

  // ── RESET ───────────────────────────────────────────────

  describe('RESET', () => {
    it('resets step to 1', () => {
      const state  = { ...baseState, step: 3 as const }
      const result = wizardReducer(state, { type: 'RESET' })
      expect(result.step).toBe(1)
    })

    it('clears propertyId', () => {
      const state  = { ...baseState, propertyId: 'some-id' }
      const result = wizardReducer(state, { type: 'RESET' })
      expect(result.propertyId).toBeNull()
    })

    it('clears generalInfo', () => {
      const state = {
        ...baseState,
        generalInfo: { name: 'Test', type: 'WEG' as const, managerId: 'm-1', accountantId: 'a-1' },
      }
      const result = wizardReducer(state, { type: 'RESET' })
      expect(result.generalInfo).toBeNull()
    })

    it('clears aiPrefilled', () => {
      const state  = { ...baseState, aiPrefilled: true }
      const result = wizardReducer(state, { type: 'RESET' })
      expect(result.aiPrefilled).toBe(false)
    })

    it('clears savedBuildings', () => {
      const state = {
        ...baseState,
        savedBuildings: [{ id: 'b-1', propertyId: 'p-1', street: 'Test', houseNumber: '1', postalCode: '10115', city: 'Berlin' }],
      }
      const result = wizardReducer(state, { type: 'RESET' })
      expect(result.savedBuildings).toHaveLength(0)
    })

    it('resets buildings to one empty building', () => {
      const state = {
        ...baseState,
        buildings: [
          { street: 'Test 1', houseNumber: '1', postalCode: '10115', city: 'Berlin' },
          { street: 'Test 2', houseNumber: '2', postalCode: '10116', city: 'Berlin' },
        ],
      }
      const result = wizardReducer(state, { type: 'RESET' })
      expect(result.buildings).toHaveLength(1)
      expect(result.buildings[0].street).toBe('')
    })
  })
})