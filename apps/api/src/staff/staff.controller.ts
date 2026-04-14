import { Controller, Get } from '@nestjs/common'
import { StaffService } from './staff.service'

@Controller('api/v1/staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  findAll() {
    return this.staffService.findAll()
  }
}