import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/bills/[id]
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const bill = await db.bill.findUnique({
    where: { id },
    include: { order: { include: { items: true, table: true } } },
  })
  if (!bill) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ bill })
}
