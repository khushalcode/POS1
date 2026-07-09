'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Edit, Trash2, Package, X, Check, Loader2, SlidersHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/format'
import type { MenuItem } from '@/lib/types'
import { useShopFetch } from '@/hooks/use-shop-fetch'

const CATEGORIES = ['Starters', 'Main Course', 'Breads', 'Beverages', 'Desserts', 'General']
const UNITS = ['Pcs', 'Plate', 'Bowl', 'Glass', 'Cup', 'Kg', 'Ltr']

export default function MenuPage() {
  const shopFetch = useShopFetch()
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<MenuItem | null>(null)
  const [delItem, setDelItem] = useState<MenuItem | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await shopFetch('/api/menu')
    const data = await res.json()
    setItems(data.items)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = items.filter((it) => {
    if (search && !it.name.toLowerCase().includes(search.toLowerCase())) return false
    if (categoryFilter !== 'all' && it.category !== categoryFilter) return false
    if (stockFilter === 'instock' && it.stock <= 5) return false
    if (stockFilter === 'low' && (it.stock > 5 || it.stock === 0)) return false
    if (stockFilter === 'out' && it.stock > 0) return false
    return true
  })

  const handleCreate = async (data: any) => {
    const res = await shopFetch('/api/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      toast.error('Failed to create item')
      return
    }
    toast.success('Item added')
    setShowAdd(false)
    load()
  }

  const handleUpdate = async (data: any) => {
    if (!editItem) return
    const res = await shopFetch(`/api/menu/${editItem.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      toast.error('Failed to update')
      return
    }
    toast.success('Item updated')
    setEditItem(null)
    load()
  }

  const handleDelete = async () => {
    if (!delItem) return
    const res = await shopFetch(`/api/menu/${delItem.id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error('Failed to delete')
      return
    }
    toast.success('Item deleted')
    setDelItem(null)
    load()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">Menu Items</h1>
          <p className="text-[10px] sm:text-sm text-slate-500">{items.length} total · {filtered.length} shown</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-40 sm:w-56 h-9 text-sm bg-white"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-32 sm:w-40 h-9 text-xs bg-white">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-28 sm:w-32 h-9 text-xs bg-white">
              <SelectValue placeholder="Stock" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock</SelectItem>
              <SelectItem value="instock">In Stock</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="out">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowAdd(true)} className="bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white">
            <Plus className="w-4 h-4 mr-1" /> Add Item
          </Button>
        </div>
      </div>

      {/* Items grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-slate-500 bg-white border-slate-200">
          <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No items found</h3>
          <p className="text-sm">Try adjusting filters or add a new item.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((it, i) => (
              <motion.div
                key={it.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.01, 0.2) }}
              >
                <Card className="border-0 shadow-md rounded-2xl overflow-hidden hover:shadow-lg transition-all hover:-translate-y-0.5 group">
                  <CardContent className="p-0">
                    <div className="h-20 bg-gradient-to-br from-orange-50 to-rose-50 flex items-center justify-center relative overflow-hidden">
                      {it.image ? (
                        <img
                          src={it.image}
                          alt={it.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.currentTarget
                            target.style.display = 'none'
                            const parent = target.parentElement
                            if (parent && !parent.querySelector('.fallback-emoji')) {
                              const span = document.createElement('span')
                              span.className = 'fallback-emoji text-3xl'
                              span.textContent = getEmoji(it.name)
                              parent.appendChild(span)
                            }
                          }}
                        />
                      ) : (
                        <span className="text-3xl">{getEmoji(it.name)}</span>
                      )}
                      <Badge className={`absolute top-1.5 right-1.5 text-[9px] px-1.5 py-0 ${catColor(it.category)}`}>
                        {it.category}
                      </Badge>
                      <Badge variant="outline" className={`absolute bottom-1.5 left-1.5 text-[9px] px-1 py-0 ${
                        it.stock > 5 ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : it.stock > 0 ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {it.stock > 5 ? 'In Stock' : it.stock > 0 ? 'Low' : 'Out'}
                      </Badge>
                      <div className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <Button size="icon" variant="secondary" className="h-6 w-6 bg-white/90 backdrop-blur" onClick={() => setEditItem(it)}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="secondary" className="h-6 w-6 bg-white/90 backdrop-blur text-rose-500" onClick={() => setDelItem(it)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-2.5">
                      <h3 className="font-semibold text-[13px] text-slate-900 truncate">{it.name}</h3>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm font-bold text-orange-600">
                          {formatCurrency(it.price)}
                          <span className="text-[10px] font-normal text-slate-400">/{it.unit}</span>
                        </p>
                        <span className="text-[10px] text-slate-500">{it.stock} {it.unit}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={showAdd || !!editItem} onOpenChange={(o) => { if (!o) { setShowAdd(false); setEditItem(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Item' : 'Add Menu Item'}</DialogTitle>
          </DialogHeader>
          <ItemForm
            initial={editItem}
            onSubmit={editItem ? handleUpdate : handleCreate}
            onCancel={() => { setShowAdd(false); setEditItem(null) }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!delItem} onOpenChange={(o) => !o && setDelItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete item</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Delete <strong>{delItem?.name}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ItemForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: MenuItem | null
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
}) {
  const [f, setF] = useState({
    name: initial?.name || '',
    category: initial?.category || 'General',
    price: initial?.price?.toString() || '',
    cost: initial?.cost?.toString() || '0',
    stock: initial?.stock?.toString() || '0',
    unit: initial?.unit || 'Pcs',
    image: initial?.image || '',
    available: initial?.available ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) {
      toast.error('Image too large (max 500KB)')
      return
    }
    setUploading(true)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setF({ ...f, image: ev.target?.result as string })
      setUploading(false)
    }
    reader.onerror = () => {
      toast.error('Could not read image')
      setUploading(false)
    }
    reader.readAsDataURL(file)
  }

  const submit = async () => {
    if (!f.name || !f.price) {
      toast.error('Name and price are required')
      return
    }
    setSaving(true)
    try {
      await onSubmit(f)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Name</Label>
        <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Paneer Tikka" />
      </div>

      {/* Image upload */}
      <div className="space-y-1.5">
        <Label className="text-xs">Item Image (optional)</Label>
        <div className="flex items-start gap-3">
          <div className="w-20 h-20 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
            {f.image ? (
              <img src={f.image} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl">{getEmoji(f.name || '')}</span>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              ref={fileInputRef}
            />
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="h-8 text-xs"
              >
                {uploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />}
                {uploading ? 'Uploading…' : 'Upload'}
              </Button>
              {f.image && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setF({ ...f, image: '' })}
                  className="h-8 text-xs text-rose-600"
                >
                  Remove
                </Button>
              )}
            </div>
            <Input
              value={f.image.startsWith('data:') ? '' : f.image}
              onChange={(e) => setF({ ...f, image: e.target.value })}
              placeholder="Or paste image URL"
              className="h-8 text-xs"
            />
            <p className="text-[10px] text-slate-400">PNG/JPG up to 500KB. Falls back to emoji if no image.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Category</Label>
          <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Unit</Label>
          <Select value={f.unit} onValueChange={(v) => setF({ ...f, unit: v })}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Price ₹</Label>
          <Input type="number" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Cost ₹</Label>
          <Input type="number" value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Stock</Label>
          <Input type="number" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} placeholder="0" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="avail"
          checked={f.available}
          onChange={(e) => setF({ ...f, available: e.target.checked })}
          className="w-4 h-4 rounded"
        />
        <Label htmlFor="avail" className="text-xs cursor-pointer">Available for ordering</Label>
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button onClick={submit} disabled={saving} className="flex-1 bg-gradient-to-r from-orange-500 to-rose-500 text-white">
          {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
          {initial ? 'Update' : 'Add'} Item
        </Button>
      </div>
    </div>
  )
}

function getEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('chicken') || n.includes('mutton')) return '🍗'
  if (n.includes('fish')) return '🐟'
  if (n.includes('paneer') || n.includes('tikka')) return '🧀'
  if (n.includes('biryani') || n.includes('rice')) return '🍚'
  if (n.includes('naan') || n.includes('roti') || n.includes('paratha')) return '🍞'
  if (n.includes('chai') || n.includes('tea') || n.includes('coffee')) return '☕'
  if (n.includes('lassi') || n.includes('juice') || n.includes('soda')) return '🥤'
  if (n.includes('water')) return '💧'
  if (n.includes('ice cream') || n.includes('brownie')) return '🍨'
  if (n.includes('gulab') || n.includes('rasmalai')) return '🍮'
  if (n.includes('dal')) return '🍲'
  if (n.includes('spring') || n.includes('fingers') || n.includes('crispy')) return '🍟'
  return '🍽️'
}

function catColor(cat: string): string {
  const map: Record<string, string> = {
    Starters: 'bg-amber-100 text-amber-700 border-amber-200',
    'Main Course': 'bg-rose-100 text-rose-700 border-rose-200',
    Breads: 'bg-orange-100 text-orange-700 border-orange-200',
    Beverages: 'bg-sky-100 text-sky-700 border-sky-200',
    Desserts: 'bg-violet-100 text-violet-700 border-violet-200',
    General: 'bg-slate-100 text-slate-700 border-slate-200',
  }
  return map[cat] || map.General
}
