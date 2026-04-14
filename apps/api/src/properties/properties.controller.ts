import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { PropertiesService } from './properties.service'
import { CreatePropertyDto } from './properties.dto'

@Controller('api/v1/properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  findAll() {
    return this.propertiesService.findAll()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.propertiesService.findOne(id)
  }

  // ValidationPipe runs class-validator against CreatePropertyDto
  // before this method is called. If name is missing or type is wrong,
  // the request is rejected with a 400 and the field-level error messages
  // from the DTO. The service never runs on invalid input.
  // whitelist: true strips any extra fields the client sent that aren't in the DTO —
  // prevents unexpected data from reaching the database.
  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Body() dto: CreatePropertyDto) {
    return this.propertiesService.create(dto)
  }
}