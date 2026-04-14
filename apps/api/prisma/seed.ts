import { PrismaClient, StaffRole } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding staff members...')

  const staff = [
    { name: 'Anna Müller',    email: 'a.mueller@buena.com',    role: StaffRole.MANAGER },
    { name: 'Jonas Weber',    email: 'j.weber@buena.com',      role: StaffRole.MANAGER },
    { name: 'Sarah Hoffmann', email: 's.hoffmann@buena.com',   role: StaffRole.MANAGER },
    { name: 'Markus Schmidt', email: 'm.schmidt@buena.com',    role: StaffRole.ACCOUNTANT },
    { name: 'Lisa Fischer',   email: 'l.fischer@buena.com',    role: StaffRole.ACCOUNTANT },
  ]

  for (const person of staff) {
    // upsert = insert if not exists, update if exists
    // This makes the seed script safe to run multiple times
    await prisma.staff.upsert({
      where:  { email: person.email },
      update: {},
      create: person,
    })
    console.log(`  ✓ ${person.name} (${person.role})`)
  }

  console.log('Seeding complete.')
}

main()
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())