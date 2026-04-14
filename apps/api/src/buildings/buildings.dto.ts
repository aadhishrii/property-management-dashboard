import { Type } from 'class-transformer'
import { IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator'

export class BuildingDto {
  @IsNotEmpty({ message: 'Street is required' })
  @IsString()
  street: string

  @IsNotEmpty({ message: 'House number is required' })
  @IsString()
  houseNumber: string

  @IsNotEmpty({ message: 'Postal code is required' })
  @IsString()
  postalCode: string

  @IsNotEmpty({ message: 'City is required' })
  @IsString()
  city: string
}

export class UpsertBuildingsDto {
  @IsArray()
  // ValidateNested tells class-validator to run validation on each
  // item in the array, not just check that an array exists.
  // @Type(() => BuildingDto) tells class-transformer what class to
  // instantiate each item as — required for ValidateNested to work.
  @ValidateNested({ each: true })
  @Type(() => BuildingDto)
  buildings: BuildingDto[]
}