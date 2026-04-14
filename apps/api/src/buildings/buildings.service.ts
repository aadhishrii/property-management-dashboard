import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { UpsertBuildingsDto } from './buildings.dto'

@Injectable()
export class BuildingsService {
  constructor(private readonly prisma: PrismaService) {}

  // Replaces all buildings for a property with the submitted set.
  //
  // Why delete-and-recreate instead of individual upserts?
  // In a wizard, the user may have added, removed, or reordered buildings
  // before hitting submit. Tracking the diff between old and new state is
  // complex. Replacing atomically in a transaction is simpler and safer:
  // either all buildings are saved or none are — the DB is never half-updated.
  //
  // The $transaction call is the key: if createMany fails for any reason,
  // the deleteMany is automatically rolled back.
  async upsertForProperty(propertyId: string, dto: UpsertBuildingsDto) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    })

    if (!property) {
      throw new NotFoundException(`Property ${propertyId} not found`)
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.building.deleteMany({ where: { propertyId } })

      await tx.building.createMany({
        data: dto.buildings.map((b) => ({
          propertyId,
          street:      b.street,
          houseNumber: b.houseNumber,
          postalCode:  b.postalCode,
          city:        b.city,
        })),
      })

      // Return the freshly created buildings with their new database IDs.
      // The frontend needs these IDs to associate units with the correct
      // building in step 3 — without this a second GET request would be needed.
      return tx.building.findMany({
        where:   { propertyId },
        orderBy: { createdAt: 'asc' },
      })
    })
  }
}