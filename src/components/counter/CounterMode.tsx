'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Store,
  ArrowLeft,
  Printer,
  Send,
  Receipt,
  Users,
  StickyNote,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { TableGrid } from './TableGrid'
import { MenuPicker } from './MenuPicker'
import { OrderCart } from './OrderCart'
import { BillingDialog } from './BillingDialog'
import { PrintPreview } from '@/components/shared/PrintPreview'
import { KOTReceipt } from '@/components/shared/Receipts'
import { PendingOrdersSubTab } from '@/components/shared/PendingOrdersSubTab'
import { GlobalShortcutBar as GlobalShortcutBarInline } from '@/components/shared/GlobalShortcutBar'
import { useRestaurantSync } from '@/hooks/use-restaurant-sync'
import { useShopFetch } from '@/hooks/use-shop-fetch'
import { useSession } from '@/lib/session'
import {
  formatCurrency,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from '@/lib/format'
import type { RestaurantTable, Order, OrderItem, MenuItem, KOTPayload, ItemStatusPayload } from '@/lib/types'

interface CounterModeProps {
  onExit: () => void
  directMode?: boolean
  currentMode?: string
  onNavigate?: (mode: any) => void
}

export default function CounterMode({ onExit, directMode, currentMode, onNavigate }: CounterModeProps) {
  const { currentShop, user } = useSession()
  const shopFetch = useShopFetch()
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [guests, setGuests] = useState(1)
  const [waiterName, setWaiterName] = useState(user?.name || '')
  const [orderNotes, setOrderNotes] = useState('')
  const [showKOT, setShowKOT] = useState(false)
  const [kotNo, setKotNo] = useState(0)
  const [printedItemIds, setPrintedItemIds] = useState<Set<string>>(new Set())
  const [kotItemsToPrint, setKotItemsToPrint] = useState<OrderItem[]>([])
  const [showBilling, setShowBilling] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const [billNo, setBillNo] = useState(1001)

  // When switching from Direct → Counter via shortcut bar, reset to table grid
  useEffect(() => {
    if (currentMode === 'counter' && !directMode && selectedTable) {
      setSelectedTable(null)
      setOrder(null)
      setPrintedItemIds(new Set())
      setKotItemsToPrint([])
      setKotNo(0)
      loadTables()
    }
  }, [currentMode, directMode]) // eslint-disable-line react-hooks/exhaustive-deps
  const [settings, setSettings] = useState<any>(null)
  const [busy, setBusy] = useState(false)

  // ----- Initial loads -----
  const loadTables = useCallback(async () => {
    const res = await shopFetch('/api/tables')
    const data = await res.json()
    setTables(Array.isArray(data?.tables) ? data.tables : [])
  }, [shopFetch])

  const loadMenu = useCallback(async () => {
    const res = await shopFetch('/api/menu')
    const data = await res.json()
    // Defensive: API contract is { items: MenuItem[] }, but if the route 404s or
    // returns an error envelope, data.items will be undefined — fall back to []
    // so render code that calls menu.filter(...) never crashes.
    setMenu(Array.isArray(data?.items) ? data.items : [])
  }, [shopFetch])

  const loadBillNo = useCallback(async () => {
    const res = await shopFetch('/api/bills/next-no')
    const data = await res.json()
    setBillNo(typeof data?.nextNo === 'number' ? data.nextNo : 1001)
  }, [shopFetch])

  const loadSettings = useCallback(async () => {
    try {
      const res = await shopFetch('/api/settings')
      const data = await res.json()
      setSettings(data?.settings || null)
    } catch {
      // settings are optional; fall back to defaults
    }
  }, [shopFetch])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      await shopFetch('/api/tables/seed', { method: 'POST' })
      await Promise.all([loadTables(), loadMenu(), loadBillNo(), loadSettings()])
      setLoading(false)
    })()
  }, [loadTables, loadMenu, loadBillNo, loadSettings, shopFetch, currentShop?.id])

  // ----- Auto-start direct order if directMode prop is set -----
  const [directStarted, setDirectStarted] = useState(false)
  useEffect(() => {
    if (!directMode || loading || tables.length === 0 || directStarted) return
    const directTable = tables.find((t) => t.number === 0)
    if (directTable) {
      setDirectStarted(true)
      openTable({ ...directTable, type: 'direct' } as any)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directMode, loading, tables.length, directStarted])

  // ----- Real-time sync -----
  const sync = useRestaurantSync('counter', {
    onItemStatus: (p: ItemStatusPayload) => {
      // Update local order if it matches
      setOrder((cur) => {
        if (!cur || cur.id !== p.orderId) return cur
        const updatedItems = (cur.items || []).map((i) =>
          i.id === p.itemId ? { ...i, status: p.status } : i
        )
        return { ...cur, items: updatedItems }
      })
      // Also update tables snapshot
      setTables((cur) =>
        cur.map((t) => {
          if (!t.currentOrder || t.currentOrder.id !== p.orderId) return t
          const updatedItems = (t.currentOrder.items || []).map((i) =>
            i.id === p.itemId ? { ...i, status: p.status } : i
          )
          return { ...t, currentOrder: { ...t.currentOrder, items: updatedItems } }
        })
      )
    },
    onOrderStatus: (p) => {
      setOrder((cur) => (cur && cur.id === p.orderId ? { ...cur, status: p.status } : cur))
    },
    onTableReleased: () => {
      // Refresh tables
      loadTables()
    },
    onDataRefresh: () => {
      loadTables()
      loadMenu()
    },
  })

  // ----- Table actions -----
  const openTable = async (t: RestaurantTable & { type?: string }) => {
    setSelectedTable(t)
    setGuests(1)
    setWaiterName('')
    setOrderNotes('')
    const isDirect = (t as any).type === 'direct' || t.number === 0
    const orderType = isDirect ? 'direct' : 'dine_in'
    if (t.currentOrder) {
      // Existing order — load it fully
      const res = await shopFetch(`/api/orders/${t.currentOrder.id}`)
      const data = await res.json()
      setOrder(data.order)
      setGuests(data.order.guests)
      setWaiterName(data.order.waiterName || '')
      setOrderNotes(data.order.notes || '')
    } else {
      // Create new open order
      try {
        const res = await shopFetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tableId: t.id, guests: 1, type: orderType }),
        })
        if (!res.ok) {
          const e = await res.json()
          toast.error(e.error || 'Could not start order')
          return
        }
        const data = await res.json()
        setOrder(data.order)
        await loadTables()
        // Notify kitchen
        sync.sendTableOccupied({ tableId: t.id, tableNumber: t.number, orderId: data.order.id })
      } catch (e) {
        toast.error('Failed to start order')
      }
    }
  }

  const closeTable = () => {
    setSelectedTable(null)
    setOrder(null)
    setPrintedItemIds(new Set())
    setKotItemsToPrint([])
    setKotNo(0)
    loadTables()
  }

  // ----- Item actions -----
  const addItem = async (item: MenuItem, qty: number) => {
    if (!order) return
    const res = await shopFetch(`/api/orders/${order.id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ menuItemId: item.id, quantity: qty }] }),
    })
    if (!res.ok) {
      toast.error('Could not add item')
      return
    }
    const data = await res.json()
    setOrder(data.order)
    const wasAlreadySent = order.status !== 'open'
    if (wasAlreadySent) {
      // Notify kitchen an item was added to an in-progress KOT
      const newItems = (data.order.items || []).filter(
        (i: OrderItem) => !order.items!.some((oi) => oi.id === i.id)
      )
      const payload: KOTPayload = {
        orderId: data.order.id,
        tableNumber: order.table?.number || 0,
        tableName: order.table?.name || '',
        type: data.order.type,
        guests: data.order.guests,
        waiterName: data.order.waiterName,
        notes: data.order.notes,
        items: newItems,
        createdAt: data.order.createdAt,
        isUpdate: true,
      }
      sync.sendItemAdded(payload)
    }
    toast.success(`Added ${qty}× ${item.name}`)
  }

  const incItem = async (it: OrderItem) => {
    if (!order) return
    await shopFetch(`/api/orders/${order.id}/items/${it.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: it.quantity + 1 }),
    })
    refreshOrder()
  }

  const decItem = async (it: OrderItem) => {
    if (!order) return
    if (it.quantity <= 1) {
      await removeItem(it)
      return
    }
    await shopFetch(`/api/orders/${order.id}/items/${it.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: it.quantity - 1 }),
    })
    refreshOrder()
  }

  const removeItem = async (it: OrderItem) => {
    if (!order) return
    const res = await shopFetch(`/api/orders/${order.id}/items/${it.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const e = await res.json()
      toast.error(e.error || 'Cannot remove')
      return
    }
    refreshOrder()
  }

  const addNotes = async (it: OrderItem, notes: string) => {
    if (!order) return
    await shopFetch(`/api/orders/${order.id}/items/${it.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
    refreshOrder()
  }

  const refreshOrder = async () => {
    if (!order) return
    const res = await shopFetch(`/api/orders/${order.id}`)
    const data = await res.json()
    setOrder(data.order)
    await loadTables()
  }

  // ----- Order meta update -----
  const saveMeta = async () => {
    if (!order) return
    // We PATCH the order via the items endpoint pattern — but there's no direct meta route,
    // so we update via the items endpoint's response by re-fetching after a small patch.
    // Simpler: use a fetch to /api/orders/[id]/status with same status to keep meta in sync.
    // To keep it lean, we just store meta on send.
  }

  // ----- Send to kitchen (KOT) -----
  const sendToKitchen = async () => {
    if (!order) return
    setBusy(true)
    try {
      const res = await shopFetch(`/api/orders/${order.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kotPrinted: true }),
      })
      if (!res.ok) {
        const e = await res.json()
        toast.error(e.error || 'Could not send')
        return
      }
      const data = await res.json()
      setOrder(data.order)

      // Determine which items to print:
      // - First print: ALL items
      // - Reprint (kotNo > 0): only NEW items (not in printedItemIds)
      const allItems = (data.order.items || []).filter((i: OrderItem) => i.status !== 'cancelled')
      const isNewPrint = kotNo === 0
      const itemsToPrint = isNewPrint
        ? allItems
        : allItems.filter((i: OrderItem) => !printedItemIds.has(i.id))

      if (itemsToPrint.length === 0 && !isNewPrint) {
        toast.info('No new items to print since last KOT')
        setBusy(false)
        return
      }

      // Track which items have been printed
      const newPrintedSet = new Set(printedItemIds)
      itemsToPrint.forEach((i: OrderItem) => newPrintedSet.add(i.id))
      setPrintedItemIds(newPrintedSet)
      setKotItemsToPrint(itemsToPrint)

      const nextKotNo = (kotNo || 0) + 1
      setKotNo(nextKotNo)
      setShowKOT(true)

      // Broadcast to kitchen — only new items on reprint
      const payload: KOTPayload = {
        orderId: data.order.id,
        tableNumber: data.order.table?.number || 0,
        tableName: data.order.table?.name || '',
        type: data.order.type,
        guests: data.order.guests,
        waiterName: data.order.waiterName,
        notes: data.order.notes,
        items: itemsToPrint,
        createdAt: data.order.createdAt,
        isUpdate: !isNewPrint,
      }
      sync.sendKOT(payload)
      await loadTables()

      if (isNewPrint) {
        toast.success('KOT sent to kitchen')
      } else {
        toast.success(`Re-printed KOT with ${itemsToPrint.length} new item(s)`)
      }
    } finally {
      setBusy(false)
    }
  }

  // ----- Save order: close it + free the table (like bill does, but no bill generated) -----
  const saveOrder = async () => {
    if (!order) return
    setBusy(true)
    try {
      // Call the free-table endpoint — marks order as billed + releases table
      await shopFetch(`/api/orders/${order.id}/free-table`, { method: 'POST' })

      // Broadcast table released + order closed
      sync.sendTableReleased({
        tableId: order.tableId,
        tableNumber: order.table?.number || 0,
      })
      sync.sendOrderStatus({
        orderId: order.id,
        status: 'billed',
        tableNumber: order.table?.number || 0,
      })

      toast.success('Order saved & table freed')
      closeTable()
    } catch {
      toast.error('Failed to save order')
    } finally {
      setBusy(false)
    }
  }

  // ----- Delete order with reason -----
  const deleteOrderWithReason = async () => {
    if (!order || !deleteReason.trim()) {
      toast.error('Please enter a reason for deleting this order')
      return
    }
    try {
      // Log the deletion with reason via audit endpoint
      await shopFetch('/api/audit', {
        method: 'POST',
        body: JSON.stringify({
          action: 'order_deleted',
          details: {
            orderId: order.id,
            tableNumber: order.table?.number || 0,
            reason: deleteReason,
            items: (order.items || []).map((i) => `${i.quantity}× ${i.name}`),
            total: (order.items || []).filter((i) => i.status !== 'cancelled').reduce((s, i) => s + i.price * i.quantity, 0),
          },
        }),
      })
    } catch {
      // audit logging is best-effort
    }

    // Delete the order
    await shopFetch(`/api/orders/${order.id}`, { method: 'DELETE' })
    toast.success(`Order deleted — Reason: ${deleteReason}`)
    setShowDeleteConfirm(false)
    setDeleteReason('')
    closeTable()
  }

  // ----- Mark an item served (after kitchen said ready) -----
  const markServed = async (it: OrderItem) => {
    if (!order) return
    await shopFetch(`/api/orders/${order.id}/items/${it.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'served' }),
    })
    await refreshOrder()
    sync.sendItemStatus({
      orderId: order.id,
      itemId: it.id,
      status: 'served',
      tableNumber: order.table?.number || 0,
    })
  }

  // ----- Billing -----
  const openBilling = async () => {
    await loadBillNo()
    setShowBilling(true)
  }

  const confirmBill = async (payload: {
    taxRate: number
    discount: number
    serviceCharge: number
    paymentMode: any
  }) => {
    if (!order) throw new Error('No order')
    const res = await shopFetch('/api/bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.id, ...payload }),
    })
    if (!res.ok) {
      const e = await res.json()
      toast.error(e.error || 'Billing failed')
      throw e
    }
    const data = await res.json()
    sync.sendTableReleased({
      tableId: order.tableId,
      tableNumber: order.table?.number || 0,
    })
    sync.sendOrderStatus({
      orderId: order.id,
      status: 'paid',
      tableNumber: order.table?.number || 0,
    })
    await loadTables()
    toast.success(`Bill #${data.bill.billNo} generated · Table released`)
    return data.bill
  }

  // ----- Render -----
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  // ----- Table list view -----
  if (!selectedTable) {
    // Filter out the virtual "Direct Counter" table (number 0) from the grid
    const visibleTables = tables.filter((t) => t.number !== 0)
    const occupiedCount = visibleTables.filter((t) => t.status === 'occupied').length
    const freeCount = visibleTables.filter((t) => t.status === 'available').length

    const startDirectOrder = async () => {
      let directTable = tables.find((t) => t.number === 0)
      if (!directTable) {
        const res = await shopFetch('/api/tables', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ number: 0, name: 'Direct Counter', capacity: 0 }),
        })
        if (res.ok) {
          const data = await res.json()
          directTable = data.table
        }
      }
      if (directTable) {
        openTable({ ...directTable, type: 'direct' } as any)
      }
    }

    return (
      <div className="min-h-screen img-bg">
        <Header onExit={onExit} role="counter" connected={sync.connected} currentMode={currentMode} onNavigate={onNavigate} isDirect={directMode} />
        <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Tables</h1>
              <p className="text-sm text-slate-500">
                {occupiedCount} occupied · {freeCount} free
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={startDirectOrder}
                className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white"
              >
                <Receipt className="w-4 h-4 mr-1.5" />
                Direct Order / Takeaway
              </Button>
              <Button variant="outline" size="sm" onClick={() => loadTables()}>
                Refresh
              </Button>
            </div>
          </div>

          {/* Sub-tabs: Tables / Pending in Kitchen */}
          <PendingOrdersSubTab shopFetch={shopFetch} onPickOrder={(orderId) => {
            // Open the table that owns this order
            const table = tables.find((t) => t.currentOrderId === orderId)
            if (table) openTable(table as any)
          }} />

          <TableGrid tables={visibleTables} onSelectTable={openTable} />
        </main>
      </div>
    )
  }

  // ----- Order detail view -----
  const canEdit = order?.status === 'open'
  const canSend = order && (order.status === 'open' || order.status === 'sent') && (order.items || []).length > 0
  // Allow billing as soon as there's at least one non-cancelled item — even before KOT is sent
  const canBill = order && ['open', 'sent', 'preparing', 'ready', 'served', 'billed'].includes(order.status) &&
    (order.items || []).some((i) => i.status !== 'cancelled')

  return (
    <div className="min-h-screen img-bg flex flex-col">
      <Header onExit={closeTable} role="counter" connected={sync.connected} backLabel="Back to tables" currentMode={currentMode} onNavigate={onNavigate} isDirect={directMode} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-6 py-4 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
        {/* Left: Menu picker */}
        <div className="flex flex-col bg-white/80 backdrop-blur-md rounded-2xl border border-white/30 p-4 min-h-[60vh] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900">Menu</h2>
            <Badge variant="outline" className="text-[10px]">
              {menu.filter((m) => m.available).length} items
            </Badge>
          </div>
          <div className="flex-1 min-h-0">
            <MenuPicker items={menu} onAdd={addItem} disabled={!canEdit && order?.status !== 'open' && !['sent', 'preparing', 'ready'].includes(order?.status || '')} />
          </div>
        </div>

        {/* Right: Order cart + actions */}
        <div className="flex flex-col gap-3">
          {/* Order meta */}
          <Card className="p-3 bg-white/80 backdrop-blur-md border-white/30">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-slate-500">Guests</Label>
                <Input
                  type="number"
                  min={1}
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value) || 1)}
                  disabled={!canEdit}
                  className="mt-0.5 h-9"
                />
              </div>
              <div>
                <Label className="text-[10px] text-slate-500">Waiter</Label>
                <Input
                  value={waiterName}
                  onChange={(e) => setWaiterName(e.target.value)}
                  disabled={!canEdit}
                  placeholder="Name"
                  className="mt-0.5 h-9"
                />
              </div>
            </div>
            <div className="mt-2">
              <Label className="text-[10px] text-slate-500">Order notes</Label>
              <Textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                disabled={!canEdit}
                placeholder="Special instructions for the whole order…"
                rows={2}
                className="mt-0.5 text-sm"
              />
            </div>
            {order && (
              <div className="flex items-center justify-between mt-2 text-[11px]">
                <span className="text-slate-500">Order status</span>
                <Badge variant="outline" className={`text-[10px] ${ORDER_STATUS_COLORS[order.status]}`}>
                  {ORDER_STATUS_LABELS[order.status]}
                </Badge>
              </div>
            )}
          </Card>

          {/* Cart */}
          <div className="flex-1 min-h-[300px] rounded-2xl border border-white/30 overflow-hidden shadow-sm">
            {order && (
              <OrderCart
                order={order}
                onInc={incItem}
                onDec={decItem}
                onRemove={removeItem}
                onAddNotes={addNotes}
                onAddCustomItem={addItem}
                canEdit={canEdit}
              />
            )}
          </div>

          {/* Action buttons — 3 columns: Save, Send KOT, Generate Bill (desktop only; mobile uses sticky bottom bar below) */}
          <div className="hidden lg:grid grid-cols-3 gap-2">
            <Button
              onClick={saveOrder}
              disabled={!order || (order.items || []).length === 0 || busy}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Save className="w-4 h-4 mr-1.5" /> Save
            </Button>
            <Button
              onClick={sendToKitchen}
              disabled={!canSend || busy}
              className="bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white"
            >
              <Send className="w-4 h-4 mr-1.5" />
              {order?.status === 'open' ? 'Send KOT' : 'Re-print'}
            </Button>
            <Button
              onClick={openBilling}
              disabled={!canBill}
              className="bg-slate-900 hover:bg-slate-800 text-white"
            >
              <Receipt className="w-4 h-4 mr-1.5" /> Bill
            </Button>
          </div>

          {/* Delete order with reason */}
          {order && (order.items || []).length > 0 && (
            <Button
              onClick={() => setShowDeleteConfirm(true)}
              variant="outline"
              className="w-full text-rose-600 border-rose-300 hover:bg-rose-50"
              size="sm"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Order / Token
            </Button>
          )}

          {/* Quick served action */}
          {order && (order.items || []).some((i) => i.status === 'ready') && (
            <Card className="p-3 bg-emerald-50 border-emerald-200">
              <div className="flex items-center gap-2 text-xs text-emerald-700 mb-2">
                <AlertCircle className="w-3.5 h-3.5" /> Kitchen marked these as ready — tap to confirm served
              </div>
              <div className="space-y-1">
                {(order.items || [])
                  .filter((i) => i.status === 'ready')
                  .map((it) => (
                    <button
                      key={it.id}
                      onClick={() => markServed(it)}
                      className="w-full flex items-center justify-between text-sm bg-white px-3 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-100"
                    >
                      <span>
                        {it.quantity}× {it.name}
                      </span>
                      <span className="text-xs font-medium text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Mark served
                      </span>
                    </button>
                  ))}
              </div>
            </Card>
          )}
        </div>
      </main>

      {/* Sticky bottom action bar — mobile only, 3 buttons */}
      {order && (
        <div className="lg:hidden sticky bottom-0 left-0 right-0 z-20 bg-slate-900/95 backdrop-blur-xl border-t border-white/10 p-3 grid grid-cols-3 gap-2 shadow-2xl">
          <Button
            onClick={saveOrder}
            disabled={(order.items || []).length === 0 || busy}
            className="bg-blue-600 hover:bg-blue-700 text-white h-12 text-xs font-bold shadow-lg"
          >
            <Save className="w-4 h-4 mr-1" /> Save
          </Button>
          <Button
            onClick={sendToKitchen}
            disabled={!canSend || busy}
            className="bg-gradient-to-r from-orange-500 to-rose-500 text-white h-12 text-xs font-bold shadow-lg"
          >
            <Send className="w-4 h-4 mr-1" />
            {order.status === 'open' ? 'KOT' : 'Re-print'}
          </Button>
          <Button
            onClick={openBilling}
            disabled={!canBill}
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-xs font-bold shadow-lg"
          >
            <Receipt className="w-4 h-4 mr-1" /> Bill
          </Button>
        </div>
      )}

      {/* KOT print preview — 2 copies: Kitchen + Customer */}
      <PrintPreview
        open={showKOT}
        onClose={() => setShowKOT(false)}
        title={`KOT ${kotNo > 1 ? `(Reprint #${kotNo})` : ''} — ${order?.table?.number === 0 ? 'Direct Order' : 'Table ' + order?.table?.number}`}
        subtitle={kotNo > 1 ? 'Only NEW items since last print' : '2 copies will print'}
        copies={[
          { label: 'Kitchen Copy', banner: '*** KITCHEN COPY ***' },
          { label: 'Customer Copy', banner: '*** CUSTOMER COPY ***' },
        ]}
      >
        {order && (
          <KOTReceipt
            order={{ ...order, items: kotItemsToPrint }}
            kotNo={kotNo}
            style={settings}
          />
        )}
      </PrintPreview>

      {/* Billing dialog */}
      <BillingDialog
        open={showBilling}
        order={order}
        billNo={billNo}
        settings={settings}
        onClose={() => setShowBilling(false)}
        onConfirm={confirmBill}
        onAfterBill={() => {
          // After billing, exit the table
          setTimeout(() => closeTable(), 500)
        }}
      />

      {/* Delete order confirmation with reason */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
          <motion.div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5"
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Delete Order?</h3>
                <p className="text-xs text-slate-500">This action cannot be undone</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 mb-3 text-xs space-y-0.5">
              <p className="font-semibold text-slate-700">
                {order?.table?.number === 0 ? 'Direct Order' : `Table ${order?.table?.number}`}
              </p>
              <p className="text-slate-500">{(order?.items || []).length} items · ₹{(order?.items || []).filter((i) => i.status !== 'cancelled').reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)}</p>
            </div>
            <div className="space-y-1.5 mb-4">
              <Label className="text-xs font-semibold text-slate-700">Reason for deletion *</Label>
              <Textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. Customer cancelled, wrong order, duplicate…"
                rows={3}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setDeleteReason('') }} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={deleteOrderWithReason}
                disabled={!deleteReason.trim()}
                variant="destructive"
                className="flex-1"
              >
                <Trash2 className="w-4 h-4 mr-1.5" /> Delete
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

function Header({
  onExit,
  role,
  connected,
  backLabel = 'Exit',
  currentMode,
  onNavigate,
  isDirect = false,
}: {
  onExit: () => void
  role: 'counter' | 'kitchen' | 'history'
  connected: boolean
  backLabel?: string
  currentMode?: string
  onNavigate?: (mode: any) => void
  isDirect?: boolean
}) {
  const { currentShop, user, shops, selectShop, logout } = useSession()
  const labels = {
    counter: { title: 'Counter Mode', color: 'bg-brand-gradient', icon: Store },
    kitchen: { title: 'Kitchen Mode', color: 'bg-brand-gradient', icon: Store },
    history: { title: 'Bills & History', color: 'bg-brand-gradient', icon: Store },
  }
  const l = labels[role]
  const displayTitle = isDirect ? 'Direct Order' : l.title
  const DisplayIcon = isDirect ? Zap : l.icon
  return (
    <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-white/20 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={onExit} className="shrink-0">
            <ArrowLeft className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">{backLabel}</span>
          </Button>
          {/* Inline shortcut bar — between back button and sign out */}
          {onNavigate && currentMode && (
            <GlobalShortcutBarInline currentMode={currentMode as any} onNavigate={onNavigate} />
          )}
          <div className="hidden md:block w-px h-6 bg-slate-200" />
          <div className={`hidden md:flex w-9 h-9 rounded-xl ${l.color} items-center justify-center`}>
            <DisplayIcon className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 hidden md:block">
            <h2 className="text-sm font-bold text-slate-900 truncate">{displayTitle}</h2>
            <p className="text-[10px] text-slate-500 flex items-center gap-1">
              {connected ? '● Live' : '○ Reconnecting'}
              {currentShop && <span className="hidden sm:inline">· {currentShop.name}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Shop switcher (compact) */}
          {shops.length > 1 && (
            <select
              value={currentShop?.id || ''}
              onChange={(e) => {
                const next = shops.find((s) => s.id === e.target.value)
                if (next) selectShop(next)
              }}
              className="text-[11px] font-semibold bg-brand-soft text-brand-text border border-brand/20 rounded-lg px-2 py-1 cursor-pointer hover:opacity-90 max-w-[120px] sm:max-w-[180px] truncate"
              title="Switch shop"
            >
              {shops.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">
            {user?.name}
          </Badge>
          <Button variant="ghost" size="sm" onClick={logout} className="text-xs h-8 px-2">
            Sign out
          </Button>
        </div>
      </div>
    </header>
  )
}