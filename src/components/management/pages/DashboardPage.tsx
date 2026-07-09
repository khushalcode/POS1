'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, Receipt, Users, Truck, UtensilsCrossed,
  Table2, AlertTriangle, Wallet, ArrowUpRight, ArrowDownRight, Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts'
import { formatCurrency, formatTime, timeAgo } from '@/lib/format'
import type { DashboardData } from '@/lib/types'
import { useShopFetch } from '@/hooks/use-shop-fetch'

export default function DashboardPage() {
  const shopFetch = useShopFetch()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await shopFetch('/api/dashboard')
        const d = await res.json()
        if (mounted) setData(d)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    const t = setInterval(load, 30_000) // auto-refresh every 30s
    return () => {
      mounted = false
      clearInterval(t)
    }
  }, [])

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const stats = [
    {
      title: "Today's Revenue",
      value: formatCurrency(data.today.revenue),
      sub: `${data.today.count} bills today`,
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-teal-500',
    },
    {
      title: 'Monthly Revenue',
      value: formatCurrency(data.month.revenue),
      sub: `${data.month.count} bills this month`,
      icon: Receipt,
      gradient: 'from-blue-500 to-indigo-500',
    },
    {
      title: 'All-Time Revenue',
      value: formatCurrency(data.allTime.revenue),
      sub: `${data.allTime.count} total bills`,
      icon: Wallet,
      gradient: 'from-violet-500 to-fuchsia-500',
    },
    {
      title: 'Tables Occupied',
      value: `${data.tables.occupied} / ${data.tables.total}`,
      sub: `${data.tables.total - data.tables.occupied} free`,
      icon: Table2,
      gradient: 'from-orange-500 to-rose-500',
    },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Restaurant overview · auto-refreshing every 30s</p>
        </div>
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 px-2 py-1 text-xs font-medium">
          <Clock className="w-3 h-3 mr-1" /> {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
        </Badge>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="border-0 shadow-md rounded-2xl overflow-hidden relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-95`} />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
              <CardContent className="relative p-4 text-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] sm:text-xs font-medium text-white/80 uppercase tracking-wide">{s.title}</span>
                  <s.icon className="w-4 h-4 text-white/80" />
                </div>
                <div className="text-xl sm:text-2xl font-bold">{s.value}</div>
                <div className="text-[10px] sm:text-xs text-white/70 mt-1">{s.sub}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Chart + recent bills */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <Card className="lg:col-span-2 border-0 shadow-md rounded-2xl">
          <CardHeader className="pb-1 px-5 pt-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-900">Revenue Trend</CardTitle>
              <Badge variant="outline" className="text-[10px] px-2">7 Days</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-2 sm:px-4 pb-4">
            {data.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={data.chartData}>
                  <defs>
                    <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickFormatter={(v: string) => new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickFormatter={(v: number) => `₹${v}`}
                    axisLine={false}
                    tickLine={false}
                    width={45}
                  />
                  <RechartsTooltip
                    formatter={(v: any) => [formatCurrency(Number(v)), 'Revenue']}
                    labelFormatter={(l: any) => new Date(l).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#f97316" strokeWidth={2.5} fill="url(#revG)" dot={{ fill: '#f97316', r: 3 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-sm text-slate-400">
                No revenue data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent bills */}
        <Card className="border-0 shadow-md rounded-2xl">
          <CardHeader className="pb-1 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-900">Recent Bills</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-4">
            <div className="space-y-1.5">
              {data.recentBills.length > 0 ? (
                data.recentBills.map((b) => (
                  <div key={b.id} className="flex items-center justify-between py-2 px-2 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                        <Receipt className="w-3.5 h-3.5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800 font-mono">#{b.billNo}</p>
                        <p className="text-[10px] text-slate-400">Table {b.tableNumber} · {timeAgo(b.paidAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-900">{formatCurrency(b.total)}</p>
                      <Badge variant="outline" className="text-[9px] px-1 py-0">{b.paymentMode}</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-sm text-slate-400">No bills yet today</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top items + low stock + cash flow */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top items */}
        <Card className="border-0 shadow-md rounded-2xl">
          <CardHeader className="pb-1 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-900">Top Selling (30 days)</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-4 space-y-2">
            {data.topItems.length > 0 ? (
              data.topItems.map((it, i) => (
                <div key={it.name} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {i + 1}
                    </div>
                    <span className="text-xs font-medium text-slate-800 truncate">{it.name}</span>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-xs font-bold text-slate-900">{it.qty} sold</p>
                    <p className="text-[10px] text-slate-400">{formatCurrency(it.revenue)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">No sales yet</div>
            )}
          </CardContent>
        </Card>

        {/* Low stock alert */}
        <Card className="border-0 shadow-md rounded-2xl">
          <CardHeader className="pb-1 px-5 pt-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-900">Low Stock</CardTitle>
              {data.lowStock.length > 0 && (
                <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-200">
                  {data.lowStock.length} items
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-4 space-y-2">
            {data.lowStock.length > 0 ? (
              data.lowStock.map((it) => (
                <div key={it.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-xs font-medium text-slate-800 truncate">{it.name}</span>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${
                    it.stock === 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {it.stock} {it.unit}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-emerald-600">All items well-stocked</div>
            )}
          </CardContent>
        </Card>

        {/* Today's cash flow */}
        <Card className="border-0 shadow-md rounded-2xl">
          <CardHeader className="pb-1 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-900">Today's Cash Flow</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-2">
            <CashFlowRow
              label="Sales"
              amount={data.cashFlow.salesIn}
              icon={ArrowUpRight}
              color="text-emerald-600"
            />
            <CashFlowRow
              label="Other Income"
              amount={data.cashFlow.otherIn}
              icon={ArrowUpRight}
              color="text-emerald-600"
            />
            <CashFlowRow
              label="Expenses"
              amount={-data.cashFlow.expenses}
              icon={ArrowDownRight}
              color="text-rose-600"
            />
            <CashFlowRow
              label="Purchases"
              amount={-data.cashFlow.purchases}
              icon={ArrowDownRight}
              color="text-rose-600"
            />
            <CashFlowRow
              label="Other Out"
              amount={-data.cashFlow.otherOut}
              icon={ArrowDownRight}
              color="text-rose-600"
            />
            <div className="border-t border-slate-200 pt-2 mt-2 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Net Today</span>
              <span className={`text-base font-bold ${data.cashFlow.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(data.cashFlow.net)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Catalog stats */}
      <div className="grid grid-cols-3 gap-3">
        <MiniStat icon={UtensilsCrossed} label="Menu Items" value={data.catalog.menuItems} color="text-orange-600 bg-orange-50" />
        <MiniStat icon={Users} label="Customers" value={data.catalog.customers} color="text-amber-600 bg-amber-50" />
        <MiniStat icon={Truck} label="Suppliers" value={data.catalog.suppliers} color="text-emerald-600 bg-emerald-50" />
      </div>
    </div>
  )
}

function CashFlowRow({ label, amount, icon: Icon, color }: { label: string; amount: number; icon: any; color: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-600 flex items-center gap-1.5">
        <Icon className={`w-3 h-3 ${color}`} />
        {label}
      </span>
      <span className={`font-semibold ${amount >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
        {formatCurrency(amount)}
      </span>
    </div>
  )
}

function MiniStat({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card className="border-0 shadow-md rounded-2xl py-3 px-2 text-center">
      <div className={`${color} p-2 rounded-lg mx-auto w-fit`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-lg font-bold text-slate-900 mt-1.5">{value}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </Card>
  )
}
