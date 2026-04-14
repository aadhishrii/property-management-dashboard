import { Injectable, NotFoundException, HttpException, HttpStatus } from '@nestjs/common'
import { PropertyType } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CreatePropertyDto } from './properties.dto'

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  // Generates a human-readable, type-coded property number.
  // BU-WEG-00042 tells a property manager the management type at a glance.
  // We count existing properties of the same type so WEG and MV have
  // independent sequences — BU-WEG-00001 and BU-MV-00001 can both exist.
  private async generatePropertyNumber(type: PropertyType): Promise<string> {
    const count = await this.prisma.property.count({ where: { type } })
    const sequence = String(count + 1).padStart(5, '0')
    return `BU-${type}-${sequence}`
  }

  async findAll() {
    return this.prisma.property.findMany({
      include: {
        // Include manager and accountant names for the dashboard table —
        // avoids a second request just to display who manages each property
        manager:    { select: { id: true, name: true } },
        accountant: { select: { id: true, name: true } },
        // _count lets us show "3 buildings · 47 units" in the dashboard
        // without fetching all the nested records
        _count: {
          select: { buildings: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(id: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        manager:   true,
        accountant: true,
        buildings: {
          include: { units: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!property) {
      throw new NotFoundException(`Property ${id} not found`)
    }

    return property
  }

async create(dto: CreatePropertyDto & { confirmDuplicate?: boolean }) {
  // Check for properties with the same name (case-insensitive)
  const existing = await this.prisma.property.findMany({
    where: {
      name: {
        equals: dto.name,
        mode: 'insensitive',
      },
    },
    select: {
      propertyNumber: true,
      name: true,
      type: true,
    },
  })

  // If duplicates exist and user hasn't confirmed, return a warning
  // The frontend shows a confirmation dialog with the existing property numbers
  // The user must explicitly confirm before we proceed
if (existing.length > 0 && !dto.confirmDuplicate) {
  const payload = {
    type:     'DUPLICATE_WARNING',
    message:  `A property named "${dto.name}" already exists`,
    existing: existing.map(p => ({
      propertyNumber: p.propertyNumber,
      type:           p.type,
    })),
  }
  console.log('Throwing duplicate warning:', JSON.stringify(payload))
  throw new HttpException(payload, HttpStatus.CONFLICT)
}

  const propertyNumber = await this.generatePropertyNumber(dto.type)

  return this.prisma.property.create({
    data: {
      name:          dto.name,
      type:          dto.type,
      propertyNumber,
      managerId:     dto.managerId,
      accountantId:  dto.accountantId,
    },
    include: {
      manager:    { select: { id: true, name: true } },
      accountant: { select: { id: true, name: true } },
    },
  })
}

async delete(id: string) {
  const property = await this.prisma.property.findUnique({
    where: { id },
  })

  if (!property) {
    throw new NotFoundException(`Property ${id} not found`)
  }

  // Cascade delete removes buildings and units automatically
  await this.prisma.property.delete({ where: { id } })

  return { deleted: true }
}

}