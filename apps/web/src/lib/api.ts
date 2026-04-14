import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

export type PropertyType = 'WEG' | 'MV'
export type UnitType = 'APARTMENT' | 'OFFICE' | 'GARDEN' | 'PARKING'

export interface StaffMember {
  id:    string
  name:  string
  email: string
}

export interface Property {
  id:             string
  propertyNumber: string
  name:           string
  type:           PropertyType
  manager:        StaffMember
  accountant:     StaffMember
  createdAt:      string
  _count:         { buildings: number }
}

export interface Building {
  id:          string
  propertyId:  string
  street:      string
  houseNumber: string
  postalCode:  string
  city:        string
}

export interface Unit {
  unitNumber:       string
  unitType:         UnitType
  buildingId:       string
  floor:            number
  entrance:         string | null
  sizeSqm:          number
  coOwnershipShare: number
  constructionYear: number | null
  rooms:            number | null
}

export interface AiExtraction {
  propertyName: string | null
  buildings: Array<{
    street:      string
    houseNumber: string
    postalCode:  string
    city:        string
  }>
  units: Array<Omit<Unit, 'buildingId'> & { buildingId?: string }>
}

export async function fetchStaff(): Promise<{
  managers:    StaffMember[]
  accountants: StaffMember[]
}> {
  const { data } = await api.get('/staff')
  return data
}

export async function fetchProperties(): Promise<Property[]> {
  const { data } = await api.get('/properties')
  return data
}

export async function createProperty(payload: {
  name:              string
  type:              PropertyType
  managerId:         string
  accountantId:      string
  confirmDuplicate?: boolean
}): Promise<Property> {
  const { data } = await api.post('/properties', payload)
  return data
}

export interface PropertyDetail {
  id:             string
  propertyNumber: string
  name:           string
  type:           PropertyType
  manager:        StaffMember
  accountant:     StaffMember
  createdAt:      string
  buildings: Array<{
    id:          string
    street:      string
    houseNumber: string
    postalCode:  string
    city:        string
    units: Array<{
      id:               string
      unitNumber:       string
      unitType:         UnitType
      floor:            number
      entrance:         string | null
      sizeSqm:          number
      coOwnershipShare: number
      constructionYear: number | null
      rooms:            number | null
    }>
  }>
}

export async function fetchProperty(id: string): Promise<PropertyDetail> {
  const { data } = await api.get(`/properties/${id}`)
  return data
}

export async function deleteProperty(id: string): Promise<void> {
  await api.delete(`/properties/${id}`)
}

export async function upsertBuildings(
  propertyId: string,
  buildings: Array<{
    street:      string
    houseNumber: string
    postalCode:  string
    city:        string
  }>,
): Promise<Building[]> {
  const { data } = await api.patch(`/properties/${propertyId}/buildings`, {
    buildings,
  })
  return data
}

export async function upsertUnits(
  propertyId: string,
  units: any[],
): Promise<{ units: Unit[]; shareWarning: string | null }> {
  const { data } = await api.patch(`/properties/${propertyId}/units`, {
    units,
  })
  return data
}

export async function uploadPdf(file: File): Promise<AiExtraction> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/upload/teilungserklaerung', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}