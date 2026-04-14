import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { UpsertUnitsDto } from './units.dto'

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertForProperty(propertyId: string, dto: UpsertUnitsDto) {
    // Verify the property exists before touching any unit data
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: { buildings: { select: { id: true } } },
    })

    if (!property) {
      throw new NotFoundException(`Property ${propertyId} not found`)
    }

    // Verify every buildingId in the payload actually belongs to this property.
    // Without this check, a malicious or buggy client could attach units
    // to buildings from a completely different property.
    const validBuildingIds = new Set(property.buildings.map((b) => b.id))
    for (const unit of dto.units) {
      if (!validBuildingIds.has(unit.buildingId)) {
        throw new NotFoundException(
          `Building ${unit.buildingId} does not belong to this property`,
        )
      }
    }

    // Same delete-and-recreate pattern as buildings — atomically replace
    // the entire unit set in a transaction so the DB is never half-saved.
    const savedUnits = await this.prisma.$transaction(async (tx) => {
      // Delete all units across all buildings of this property
      const buildingIds = property.buildings.map((b) => b.id)
      await tx.unit.deleteMany({
        where: { buildingId: { in: buildingIds } },
      })

      await tx.unit.createMany({
        data: dto.units.map((u) => ({
          buildingId:       u.buildingId,
          unitNumber:       u.unitNumber,
          unitType:         u.unitType,
          floor:            u.floor,
          entrance:         u.entrance,
          sizeSqm:          u.sizeSqm,
          coOwnershipShare: u.coOwnershipShare,
          constructionYear: u.constructionYear,
          rooms:            u.rooms,
        })),
      })

      return tx.unit.findMany({
        where: { buildingId: { in: buildingIds } },
        orderBy: { createdAt: 'asc' },
      })
    })

    // Co-ownership share validation.
    // In WEG law, all shares must sum to exactly 1.0 (1000/1000).
    // We use a tolerance of 0.001 rather than strict equality because
    // floating point arithmetic can produce results like 0.9999999999 —
    // we don't want to reject valid data over a rounding artefact.
    // This is a warning not a hard error — the user may be mid-entry
    // and intending to adjust shares. We return the warning alongside
    // the saved units so the frontend can display it in the UI.
    const totalShare = dto.units.reduce((sum, u) => sum + u.coOwnershipShare, 0)
    const shareWarning =
      Math.abs(totalShare - 1) > 0.001
        ? `Co-ownership shares total ${(totalShare * 100).toFixed(2)}% — expected 100%`
        : null

    return {
      units: savedUnits,
      shareWarning,
    }
  }
}