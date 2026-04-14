import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator'
import { PropertyType } from '@prisma/client'
 
export class CreatePropertyDto {
  // @IsNotEmpty rejects empty strings and null.
  // The message is shown directly in the API response — the frontend
  // can surface it as a field error without any translation.
  @IsNotEmpty({ message: 'Property name is required' })
  @IsString()
  name: string
 
  // @IsEnum rejects any value not in the PropertyType enum.
  // Without this someone could POST type: "FREEHOLD" and it would
  // reach the database — we catch it here instead.
  @IsEnum(PropertyType, { message: 'Type must be WEG or MV' })
  type: PropertyType
 
  @IsUUID('4', { message: 'Manager must be a valid staff member' })
  managerId: string
 
  @IsUUID('4', { message: 'Accountant must be a valid staff member' })
  accountantId: string
}
 