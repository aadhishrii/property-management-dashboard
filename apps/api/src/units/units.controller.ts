import { Body, Controller, Param, Patch, UsePipes, ValidationPipe } from '@nestjs/common'
import { UnitsService } from './units.service'
import { UpsertUnitsDto } from './units.dto'

@Controller('api/v1/properties/:propertyId/units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Patch()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  upsert(
    @Param('propertyId') propertyId: string,
    @Body() dto: UpsertUnitsDto,
  ) {
    return this.unitsService.upsertForProperty(propertyId, dto)
  }
}