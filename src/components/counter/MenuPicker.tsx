'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/format'
import { getItemEmoji } from '@/lib/menu-images'
import type { MenuItem } from '@/lib/types'

interface MenuPickerProps {
  items: MenuItem[]
  onAdd: (item: MenuItem, qty: number) => void
  disabled?: boolean
}

export function MenuPicker({ items, onAdd, disabled }: MenuPickerProps) {
  const [search, setSearch] = useState('')

  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>()
    items.forEach((item) => {
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return
      const arr = map.get(item.category) || []
      arr.push(item)
      map.set(item.category, arr)
    })
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [items, search])

  return (
    <div className="flex flex-col h-full">
      {/* Search — glassmorphism */}
      <div className="relative mb-3 shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search menu…"
          className="pl-9 bg-white/70 backdrop-blur-md border-white/30 shadow-sm"
        />
      </div>

      {/* Items grouped by category — glassmorphism cards */}
      <div className="overflow-y-auto flex-1 pr-1 space-y-4">
        {grouped.map(([category, catItems]) => (
          <div key={category}>
            {/* Category header — glassmorphism sticky */}
            <div className="flex items-center gap-2 mb-2 sticky top-0 z-10 py-1.5 px-2 rounded-lg bg-white/80 backdrop-blur-md shadow-sm border border-white/30">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{category}</span>
              <span className="text-[10px] text-slate-400">({catItems.length})</span>
            </div>
            {/* Items grid — glassmorphism cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {catItems.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.15, delay: i * 0.01 }}
                >
                  <Card
                    className={`overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg backdrop-blur-md bg-white/80 border-white/40 ${
                      disabled || !item.available ? 'opacity-50 pointer-events-none' : ''
                    } ${cardGlow(category)}`}
                    onClick={() => !disabled && item.available && onAdd(item, 1)}
                  >
                    {/* Image area */}
                    <div className="h-14 bg-gradient-to-br from-white/60 to-slate-100/60 backdrop-blur-sm flex items-center justify-center relative overflow-hidden">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.currentTarget
                            target.style.display = 'none'
                            const parent = target.parentElement
                            if (parent && !parent.querySelector('.fallback-emoji')) {
                              const span = document.createElement('span')
                              span.className = 'fallback-emoji text-2xl'
                              span.textContent = getItemEmoji(item.name)
                              parent.appendChild(span)
                            }
                          }}
                        />
                      ) : (
                        <span className="text-2xl">{getItemEmoji(item.name)}</span>
                      )}
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm">
                        <Plus className="w-3 h-3 text-slate-600" />
                      </div>
                      {!item.available && (
                        <div className="absolute inset-0 bg-rose-900/40 flex items-center justify-center">
                          <Badge variant="outline" className="text-[9px] bg-rose-50 text-rose-700 border-rose-200">NA</Badge>
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="p-2 bg-white/60 backdrop-blur-sm">
                      <h4 className="font-semibold text-[12px] text-slate-900 leading-tight truncate">{item.name}</h4>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-bold text-sm text-slate-900">{formatCurrency(item.price)}</span>
                        <span className="text-[9px] text-slate-500">{item.unit}</span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
        {grouped.length === 0 && (
          <div className="text-center py-8 text-sm text-slate-400">No items match your search</div>
        )}
      </div>
    </div>
  )
}

function cardGlow(category: string): string {
  const map: Record<string, string> = {
    Sandwich: 'hover:shadow-amber-200/50',
    Pizza: 'hover:shadow-rose-200/50',
    Maggie: 'hover:shadow-orange-200/50',
    Momos: 'hover:shadow-sky-200/50',
    Burgers: 'hover:shadow-amber-200/50',
    'Chips & Fries': 'hover:shadow-yellow-200/50',
    Drinks: 'hover:shadow-blue-200/50',
    Juices: 'hover:shadow-emerald-200/50',
    Shakes: 'hover:shadow-violet-200/50',
  }
  return map[category] || 'hover:shadow-slate-200/50'
}
