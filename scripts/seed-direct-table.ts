import { db } from '../src/lib/db'

async function main() {
  console.log('Ensuring virtual Direct Counter table exists...')

  // Direct Counter virtual table — number 0, hidden from main grid
  const existing = await db.restaurantTable.findUnique({ where: { number: 0 } })
  if (!existing) {
    await db.restaurantTable.create({
      data: {
        number: 0,
        name: 'Direct Counter',
        capacity: 0,
        status: 'available',
      },
    })
    console.log('Created Direct Counter virtual table (number 0)')
  } else {
    console.log('Direct Counter table already exists')
  }

  console.log('Done.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
