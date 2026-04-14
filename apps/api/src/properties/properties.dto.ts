import { IsEnum, IsNotEmpty, IsString, IsUUID, IsBoolean, IsOptional } from 'class-validator'
import { PropertyType } from '@prisma/client'

export class CreatePropertyDto {
  @IsNotEmpty({ message: 'Property name is required' })
  @IsString()
  name: string

  @IsEnum(PropertyType, { message: 'Type must be WEG or MV' })
  type: PropertyType

  @IsUUID('4', { message: 'Manager must be a valid staff member' })
  managerId: string

  @IsUUID('4', { message: 'Accountant must be a valid staff member' })
  accountantId: string

  // Optional — when true, bypasses the duplicate name warning
  // and creates the property anyway
  @IsOptional()
  @IsBoolean()
  confirmDuplicate?: boolean
}
 