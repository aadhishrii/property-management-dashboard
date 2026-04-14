import { Body, Controller, Param, Patch, UsePipes, ValidationPipe } from '@nestjs/common'
import { BuildingsService } from './buildings.service'
import { UpsertBuildingsDto } from './buildings.dto'

// Nested under /properties/:propertyId — makes it clear these buildings
// belong to a specific property. The propertyId comes from the URL,
// not the request body, which is the RESTful convention.
@Controller('api/v1/properties/:propertyId/buildings')
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  // PATCH not POST — we're replacing the current set of buildings,
  // which is a partial update of the property resource.
  // POST would imply creating a brand new resource, which isn't what's happening.
  @Patch()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  upsert(
    @Param('propertyId') propertyId: string,
    @Body() dto: UpsertBuildingsDto,
  ) {
    return this.buildingsService.upsertForProperty(propertyId, dto)
  }
}