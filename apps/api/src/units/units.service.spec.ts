import { Test, TestingModule } from '@nestjs/testing'
import { UnitsService } from './units.service'
import { PrismaService } from '../prisma/prisma.service'
import { NotFoundException } from '@nestjs/common'
import { UnitType } from '@prisma/client'

// Mock PrismaService so tests run without a real database.
// Every Prisma method is replaced with a jest.fn() that we control
// per test. This makes tests fast, deterministic, and independent.
const mockPrisma = {
  property: {
    findUnique: jest.fn(),
  },
  unit: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
    findMany:   jest.fn(),
  },
  $transaction: jest.fn(),
}

// Reusable test data
const mockBuilding  = { id: 'building-1' }
const mockProperty  = {
  id:        'property-1',
  buildings: [mockBuilding],
}

// Helper to create a valid unit payload — override individual fields per test
const makeUnit = (overrides: Record<string, any> = {}) => ({
  unitNumber:       'W-01',
  unitType:         UnitType.APARTMENT,
  buildingId:       'building-1',
  floor:            1,
  sizeSqm:          68,
  coOwnershipShare: 0.11,
  ...overrides,
})

// Sets up standard mocks for the transaction pattern.
// Most tests use this — override individual mocks as needed.
function setupTransactionMocks() {
  mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma))
  mockPrisma.unit.deleteMany.mockResolvedValue({ count: 0 })
  mockPrisma.unit.createMany.mockResolvedValue({ count: 1 })
  mockPrisma.unit.findMany.mockResolvedValue([])
}

describe('UnitsService', () => {
  let service: UnitsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    service = module.get<UnitsService>(UnitsService)
    jest.clearAllMocks()
  })

  // ── Property validation ─────────────────────────────────

  describe('property validation', () => {
    it('throws NotFoundException when property does not exist', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(null)

      await expect(
        service.upsertForProperty('nonexistent-id', { units: [] }),
      ).rejects.toThrow(NotFoundException)
    })

    it('error message includes the property id', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(null)

      await expect(
        service.upsertForProperty('bad-id-123', { units: [] }),
      ).rejects.toThrow('bad-id-123')
    })
  })

  // ── Building ownership validation ───────────────────────

  describe('building ownership validation', () => {
    it('throws NotFoundException when buildingId does not belong to property', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(mockProperty)

      await expect(
        service.upsertForProperty('property-1', {
          units: [makeUnit({ buildingId: 'completely-wrong-building' })],
        }),
      ).rejects.toThrow(NotFoundException)
    })

    it('error message includes the invalid buildingId', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(mockProperty)

      await expect(
        service.upsertForProperty('property-1', {
          units: [makeUnit({ buildingId: 'foreign-building-id' })],
        }),
      ).rejects.toThrow('foreign-building-id')
    })

    it('accepts units whose buildingId belongs to the property', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(mockProperty)
      setupTransactionMocks()

      // Should not throw
      await expect(
        service.upsertForProperty('property-1', {
          units: [makeUnit({ buildingId: 'building-1' })],
        }),
      ).resolves.toBeDefined()
    })

    it('accepts units across multiple buildings of the same property', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({
        id:        'property-1',
        buildings: [{ id: 'building-1' }, { id: 'building-2' }],
      })
      setupTransactionMocks()

      await expect(
        service.upsertForProperty('property-1', {
          units: [
            makeUnit({ unitNumber: 'W-01', buildingId: 'building-1' }),
            makeUnit({ unitNumber: 'W-02', buildingId: 'building-2' }),
          ],
        }),
      ).resolves.toBeDefined()
    })
  })

  // ── Transaction guarantees ──────────────────────────────

  describe('transaction guarantees', () => {
    it('wraps operations in a transaction', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(mockProperty)
      setupTransactionMocks()

      await service.upsertForProperty('property-1', { units: [] })

      // Transaction must be called — this guarantees atomicity.
      // If it weren't wrapped, a failed createMany would leave
      // the property with no units after the deleteMany ran.
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
    })

    it('calls deleteMany before createMany', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(mockProperty)

      const callOrder: string[] = []
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma))
      mockPrisma.unit.deleteMany.mockImplementation(async () => {
        callOrder.push('delete')
        return { count: 0 }
      })
      mockPrisma.unit.createMany.mockImplementation(async () => {
        callOrder.push('create')
        return { count: 1 }
      })
      mockPrisma.unit.findMany.mockResolvedValue([])

      await service.upsertForProperty('property-1', {
        units: [makeUnit()],
      })

      // Delete must happen before create — this is the atomic replacement pattern
      expect(callOrder).toEqual(['delete', 'create'])
    })

    it('deletes units from all buildings of the property', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({
        id:        'property-1',
        buildings: [{ id: 'building-1' }, { id: 'building-2' }],
      })
      setupTransactionMocks()

      await service.upsertForProperty('property-1', { units: [] })

      // deleteMany should be called with all building IDs
      expect(mockPrisma.unit.deleteMany).toHaveBeenCalledWith({
        where: { buildingId: { in: ['building-1', 'building-2'] } },
      })
    })
  })

  // ── Co-ownership share validation ───────────────────────

  describe('co-ownership share validation', () => {
    beforeEach(() => {
      mockPrisma.property.findUnique.mockResolvedValue(mockProperty)
      setupTransactionMocks()
    })

    it('returns null shareWarning when shares total exactly 1.0', async () => {
      const result = await service.upsertForProperty('property-1', {
        units: [makeUnit({ coOwnershipShare: 1.0 })],
      })
      expect(result.shareWarning).toBeNull()
    })

    it('returns shareWarning when shares do not total 1.0', async () => {
      const result = await service.upsertForProperty('property-1', {
        units: [makeUnit({ coOwnershipShare: 0.5 })],
      })
      expect(result.shareWarning).not.toBeNull()
    })

    it('shareWarning message includes the actual percentage', async () => {
      const result = await service.upsertForProperty('property-1', {
        units: [makeUnit({ coOwnershipShare: 0.75 })],
      })
      expect(result.shareWarning).toContain('75.00%')
    })

    it('shareWarning message includes "expected 100%"', async () => {
      const result = await service.upsertForProperty('property-1', {
        units: [makeUnit({ coOwnershipShare: 0.5 })],
      })
      expect(result.shareWarning).toContain('expected 100%')
    })

    // The most critical test — floating point tolerance
    // In JavaScript: 0.1 + 0.2 + 0.7 = 0.9999999999999999 not exactly 1.0
    // Without Math.abs tolerance, valid data would falsely trigger a warning
    it('accepts shares totalling 1.0 within floating point tolerance', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({
        id:        'property-1',
        buildings: [mockBuilding],
      })

      const result = await service.upsertForProperty('property-1', {
        units: [
          makeUnit({ unitNumber: 'W-01', coOwnershipShare: 0.1 }),
          makeUnit({ unitNumber: 'W-02', coOwnershipShare: 0.2 }),
          makeUnit({ unitNumber: 'W-03', coOwnershipShare: 0.7 }),
          // 0.1 + 0.2 + 0.7 = 0.9999999999999999 in JavaScript
        ],
      })

      expect(result.shareWarning).toBeNull()
    })

    it('accepts shares that total just under 1.0 within tolerance', async () => {
      const result = await service.upsertForProperty('property-1', {
        units: [makeUnit({ coOwnershipShare: 0.9999 })],
      })
      // 0.9999 is within 0.001 of 1.0 so should not warn
      expect(result.shareWarning).toBeNull()
    })

    it('warns when shares are significantly under 1.0', async () => {
      const result = await service.upsertForProperty('property-1', {
        units: [
          makeUnit({ unitNumber: 'W-01', coOwnershipShare: 0.25 }),
          makeUnit({ unitNumber: 'W-02', coOwnershipShare: 0.25 }),
          // Total: 0.5 — significantly off
        ],
      })
      expect(result.shareWarning).not.toBeNull()
    })

    it('warns when shares exceed 1.0', async () => {
      const result = await service.upsertForProperty('property-1', {
        units: [
          makeUnit({ unitNumber: 'W-01', coOwnershipShare: 0.6 }),
          makeUnit({ unitNumber: 'W-02', coOwnershipShare: 0.6 }),
          // Total: 1.2 — over 100%
        ],
      })
      expect(result.shareWarning).not.toBeNull()
    })

    it('returns null shareWarning when no units submitted', async () => {
      const result = await service.upsertForProperty('property-1', { units: [] })
      // 0 shares total 0.0 which is not 1.0, but we return null
      // for empty submissions since there's nothing to validate
      expect(result.shareWarning).toBeNull()
    })

    // Real data from the Parkview PDF
    // 110+108+120+90+160+125+75+102+(5*5)+5 = 1000/1000 = exactly 1.0
    it('accepts the exact shares from the Parkview test PDF', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({
        id:        'property-1',
        buildings: [mockBuilding],
      })

      const result = await service.upsertForProperty('property-1', {
        units: [
          makeUnit({ unitNumber: '01', coOwnershipShare: 0.110 }),
          makeUnit({ unitNumber: '02', coOwnershipShare: 0.108 }),
          makeUnit({ unitNumber: '03', coOwnershipShare: 0.120 }),
          makeUnit({ unitNumber: '04', coOwnershipShare: 0.090 }),
          makeUnit({ unitNumber: '05', coOwnershipShare: 0.160 }),
          makeUnit({ unitNumber: '06', coOwnershipShare: 0.125 }),
          makeUnit({ unitNumber: '07', coOwnershipShare: 0.075 }),
          makeUnit({ unitNumber: '08', coOwnershipShare: 0.102 }),
          makeUnit({ unitNumber: '09', coOwnershipShare: 0.001 }),
          makeUnit({ unitNumber: '10', coOwnershipShare: 0.001 }),
          makeUnit({ unitNumber: '11', coOwnershipShare: 0.001 }),
          makeUnit({ unitNumber: '12', coOwnershipShare: 0.001 }),
          makeUnit({ unitNumber: '13', coOwnershipShare: 0.001 }),
          makeUnit({ unitNumber: '14', coOwnershipShare: 0.005 }),
        ],
      })

      expect(result.shareWarning).toBeNull()
    })
  })

  // ── Return value ────────────────────────────────────────

  describe('return value', () => {
    it('returns units from the database after save', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(mockProperty)
      setupTransactionMocks()

      const savedUnits = [
        { id: 'unit-db-id-1', buildingId: 'building-1', unitNumber: 'W-01',
          unitType: UnitType.APARTMENT, floor: 1, sizeSqm: 68,
          coOwnershipShare: 0.11, createdAt: new Date(),
          entrance: null, constructionYear: null, rooms: null },
      ]
      mockPrisma.unit.findMany.mockResolvedValue(savedUnits)

      const result = await service.upsertForProperty('property-1', {
        units: [makeUnit()],
      })

      expect(result.units).toEqual(savedUnits)
    })

    it('returns both units and shareWarning in response', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(mockProperty)
      setupTransactionMocks()

      const result = await service.upsertForProperty('property-1', {
        units: [makeUnit()],
      })

      // Response always has both fields
      expect(result).toHaveProperty('units')
      expect(result).toHaveProperty('shareWarning')
    })
  })
})