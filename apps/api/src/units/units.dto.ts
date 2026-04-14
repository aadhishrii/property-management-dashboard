import { UnitType } from '@prisma/client'
import { Type } from 'class-transformer'
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator'

export class UnitDto {
  @IsNotEmpty({ message: 'Unit number is required' })
  @IsString()
  unitNumber: string

  @IsEnum(UnitType, {
    message: 'Unit type must be APARTMENT, OFFICE, GARDEN, or PARKING',
  })
  unitType: UnitType

  // buildingId links this unit to the building created in step 2.
  // The frontend gets these IDs from the step 2 API response
  // and populates the building dropdown in the unit table.
  @IsUUID('4', { message: 'Building must be a valid building' })
  buildingId: string

  @IsInt({ message: 'Floor must be a whole number' })
  floor: number

  // entrance is optional — not all buildings have named entrances (A, B, C)
  @IsOptional()
  @IsString()
  entrance?: string

  @IsNumber({}, { message: 'Size must be a number' })
  @IsPositive({ message: 'Size must be greater than 0' })
  sizeSqm: number

  // coOwnershipShare is stored as a decimal fraction (0 to 1).
  // In WEG law this must sum to 1.0 across all units in the property.
  // The UI shows it per-mille (e.g. 43.2 out of 1000) but we normalise
  // to a fraction on the way in so the validation logic is straightforward.
  @IsNumber()
  @Min(0, { message: 'Co-ownership share cannot be negative' })
  @Max(1, { message: 'Co-ownership share cannot exceed 1' })
  coOwnershipShare: number

  // constructionYear is optional — older buildings often lack this data.
  // Bounds prevent clearly wrong values like year 0 or year 3000.
  @IsOptional()
  @IsInt()
  @Min(1800, { message: 'Construction year seems too early' })
  @Max(2100, { message: 'Construction year seems too far in the future' })
  constructionYear?: number

  // rooms is optional — parking spots and garden units don't have rooms
  @IsOptional()
  @IsInt()
  @Min(1)
  rooms?: number
}

export class UpsertUnitsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UnitDto)
  units: UnitDto[]
}