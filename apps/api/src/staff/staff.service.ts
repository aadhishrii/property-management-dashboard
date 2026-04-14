import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  // Returns all staff members grouped by role.
  // The frontend uses managers for the manager dropdown
  // and accountants for the accountant dropdown in step 1.
  async findAll() {
    const [managers, accountants] = await Promise.all([
      this.prisma.staff.findMany({
        where:   { role: 'MANAGER' },
        select:  { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.staff.findMany({
        where:   { role: 'ACCOUNTANT' },
        select:  { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      }),
    ])

    // Promise.all runs both queries in parallel — faster than sequential awaits.
    // We return them grouped so the frontend can feed each directly
    // to the correct dropdown without filtering client-side.
    return { managers, accountants }
  }
}