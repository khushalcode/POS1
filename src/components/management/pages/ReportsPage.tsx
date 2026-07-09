'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Receipt, Wallet, Download, Filter, Package, CreditCard } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RechartsTooltip, Legend, PieChart, Pie, Cell,
} from 'recharts'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { useShopFetch } from '@/hooks/use-shop-fetch'

const PIE_COLORS = ['#f97316', '#10b981', '#8b5cf6', '#ef4444', '#3b82f6', '#0f172a']

export default function ReportsPage() {
  const shopFetch = useShopFetch()
  const [type, setType] = useState<'daily' | 'monthly' | 'range'>('daily')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [productFilter, setProductFilter] = useState('all')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const params = new URLSearchParams({ type })
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const res = await shopFetch(`/api/reports?${params.toString()}`)
      const d = await res.json()
      setData(d)
      setLoading(false)
    }
    load()
  }, [type, from, to, shopFetch])

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  const s = data.summary

  // Apply payment mode filter to bills
  let filteredBills = data.bills || []
  if (paymentFilter !== 'all') {
    filteredBills = filteredBills.filter((b: any) => b.paymentMode === paymentFilter)
  }

  // Recalculate summary from filtered bills
  const filteredRevenue = filteredBills.reduce((sum: number, b: any) => sum + b.total, 0)
  const filteredCount = filteredBills.length

  // Apply product filter to top items
  let filteredTopItems = data.topItems || []
  if (productFilter !== 'all') {
    filteredTopItems = filteredTopItems.filter((it: any) => {
      // Match product filter against item category (we don't have category in reports, so filter by name contains)
      return it.name.toLowerCase().includes(productFilter.toLowerCase())
    })
  }

  const stats = [
    { title: 'Sales Revenue', value: formatCurrency(filteredRevenue), icon: TrendingUp, gradient: 'from-emerald-500 to-teal-500', sub: `${filteredCount} bills` },
    { title: 'Expenses', value: formatCurrency(s.totalExpenses), icon: Wallet, gradient: 'from-red-500 to-rose-500', sub: 'Operating costs' },
    { title: 'Purchases', value: formatCurrency(s.totalPurchases), icon: Receipt, gradient: 'from-amber-500 to-orange-500', sub: 'Stock purchases' },
    { title: 'Net Profit', value: formatCurrency(filteredRevenue - s.totalExpenses - s.totalPurchases), icon: BarChart3, gradient: filteredRevenue - s.totalExpenses - s.totalPurchases >= 0 ? 'from-blue-500 to-indigo-500' : 'from-rose-500 to-pink-500', sub: `Avg/bill: ${formatCurrency(filteredCount > 0 ? filteredRevenue / filteredCount : 0)}` },
  ]

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ ...data, filteredBills, filteredTopItems, paymentFilter, productFilter }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-${type}-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Payment mode pie chart data
  const paymentData = Object.entries(data.byPayment || {}).map(([mode, v]: [string, any]) => ({
    name: mode.toUpperCase(),
    value: v.total,
    count: v.count,
  }))

  // Product sales bar chart data
  const productBarData = (filteredTopItems.length > 0 ? filteredTopItems : data.topItems || []).slice(0, 10).map((it: any) => ({
    name: it.name.length > 15 ? it.name.slice(0, 12) + '…' : it.name,
    fullName: it.name,
    qty: it.qty,
    revenue: it.revenue,
  }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">Reports</h1>
          <p className="text-[10px] sm:text-sm text-slate-500">Financial performance · all filters</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="w-3.5 h-3.5 mr-1" /> Export JSON
        </Button>
      </div>

      {/* Filters — period + payment mode + product search */}
      <Card className="border-0 shadow-md rounded-2xl p-4 bg-white">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Period</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Today</SelectItem>
                <SelectItem value="monthly">This Month</SelectItem>
                <SelectItem value="range">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><CreditCard className="w-3 h-3" /> Payment Mode</Label>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><Package className="w-3 h-3" /> Product Search</Label>
            <Input
              value={productFilter === 'all' ? '' : productFilter}
              onChange={(e) => setProductFilter(e.target.value || 'all')}
              placeholder="Search item name…"
              className="h-9"
            />
          </div>
          {type === 'range' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">From</Label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">To</Label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
              </div>
            </div>
          )}
        </div>
        {(paymentFilter !== 'all' || productFilter !== 'all') && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-slate-500">Active filters:</span>
            {paymentFilter !== 'all' && <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700">{paymentFilter.toUpperCase()}</Badge>}
            {productFilter !== 'all' && <Badge variant="outline" className="text-[10px] bg-violet-50 text-violet-700">"{productFilter}"</Badge>}
            <button onClick={() => { setPaymentFilter('all'); setProductFilter('all') }} className="text-[10px] text-rose-500 hover:underline">Clear all</button>
          </div>
        )}
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((st, i) => (
          <motion.div key={st.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-0 shadow-md rounded-2xl overflow-hidden relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${st.gradient} opacity-95`} />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
              <CardContent className="relative p-4 text-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-medium text-white/80 uppercase tracking-wide">{st.title}</span>
                  <st.icon className="w-4 h-4 text-white/80" />
                </div>
                <div className="text-xl sm:text-2xl font-bold">{st.value}</div>
                <div className="text-[10px] text-white/70">{st.sub}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sales vs Expenses bar chart */}
        <Card className="border-0 shadow-md rounded-2xl">
          <CardHeader className="pb-1 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-900">Sales vs Expenses</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-2 sm:px-4 pb-4">
            {data.dailyBreakdown?.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.dailyBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v: string) => new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v: number) => `₹${v}`} axisLine={false} tickLine={false} width={45} />
                  <RechartsTooltip formatter={(v: any, name: string) => [formatCurrency(Number(v)), name === 'sales' ? 'Sales' : 'Expenses']} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="sales" name="Sales" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-[250px] flex items-center justify-center text-sm text-slate-400">No data for the period</div>}
          </CardContent>
        </Card>

        {/* Payment mode pie chart */}
        <Card className="border-0 shadow-md rounded-2xl">
          <CardHeader className="pb-1 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-900">Payment Mode Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-2 sm:px-4 pb-4">
            {paymentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                    {paymentData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip formatter={(v: any) => formatCurrency(Number(v))} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-[250px] flex items-center justify-center text-sm text-slate-400">No payment data</div>}
          </CardContent>
        </Card>
      </div>

      {/* Product sales bar chart */}
      <Card className="border-0 shadow-md rounded-2xl">
        <CardHeader className="pb-1 px-5 pt-5">
          <CardTitle className="text-sm font-semibold text-slate-900">Product Sales ({productFilter === 'all' ? 'All' : `"${productFilter}"`})</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-2 sm:px-4 pb-4">
          {productBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={productBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={100} />
                <RechartsTooltip formatter={(v: any, name: string) => name === 'qty' ? [`${v} sold`, 'Quantity'] : [formatCurrency(Number(v)), 'Revenue']} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="qty" name="Quantity Sold" fill="#f97316" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-[300px] flex items-center justify-center text-sm text-slate-400">No product sales data</div>}
        </CardContent>
      </Card>

      {/* Top items + payment breakdown tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-md rounded-2xl">
          <CardHeader className="pb-1 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-900">Top Selling Items {productFilter !== 'all' && `(filtered: "${productFilter}")`}</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-4">
            <div className="space-y-2">
              {(filteredTopItems.length > 0 ? filteredTopItems : data.topItems || []).slice(0, 10).map((it: any, i: number) => (
                <div key={it.name} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</div>
                    <span className="text-xs font-medium text-slate-800">{it.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-900">{it.qty} sold</span>
                    <span className="text-[10px] text-slate-400 ml-2">{formatCurrency(it.revenue)}</span>
                  </div>
                </div>
              )) || <div className="py-6 text-center text-xs text-slate-400">No items match filter</div>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md rounded-2xl">
          <CardHeader className="pb-1 px-5 pt-5">
            <CardTitle className="text-sm font-semibold text-slate-900">Expense Breakdown by Category</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-4">
            <div className="space-y-2">
              {Object.keys(data.expenseByCategory || {}).length > 0 ? (
                Object.entries(data.expenseByCategory).map(([cat, amt]: [string, any]) => (
                  <div key={cat} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-slate-50">
                    <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">{cat}</Badge>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-900">{formatCurrency(amt)}</span>
                    </div>
                  </div>
                ))
              ) : <div className="py-6 text-center text-xs text-slate-400">No expenses in this period</div>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bills table — filtered by payment mode */}
      <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
        <CardHeader className="pb-1 px-5 pt-5">
          <CardTitle className="text-sm font-semibold text-slate-900">Bills ({filteredBills.length}) {paymentFilter !== 'all' && `· ${paymentFilter.toUpperCase()} only`}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="text-left font-semibold text-slate-600 px-3 py-2">Bill #</th>
                  <th className="text-left font-semibold text-slate-600 px-3 py-2">Date</th>
                  <th className="text-left font-semibold text-slate-600 px-3 py-2">Table</th>
                  <th className="text-left font-semibold text-slate-600 px-3 py-2">Items</th>
                  <th className="text-left font-semibold text-slate-600 px-3 py-2">Payment</th>
                  <th className="text-right font-semibold text-slate-600 px-3 py-2">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBills.slice(0, 100).map((b: any) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono font-semibold text-slate-900">#{b.billNo}</td>
                    <td className="px-3 py-2 text-slate-600">{formatDateTime(b.paidAt)}</td>
                    <td className="px-3 py-2"><Badge variant="outline" className="text-[9px]">Table {b.tableNumber}</Badge></td>
                    <td className="px-3 py-2 text-slate-600">{b.order?.items?.filter((i: any) => i.status !== 'cancelled').length || 0}</td>
                    <td className="px-3 py-2"><Badge variant="outline" className="text-[9px] uppercase">{b.paymentMode}</Badge></td>
                    <td className="px-3 py-2 text-right font-bold text-slate-900">{formatCurrency(b.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredBills.length > 100 && <div className="p-2 text-center text-[10px] text-slate-400 bg-slate-50">Showing 100 of {filteredBills.length} bills</div>}
        </CardContent>
      </Card>
    </div>
  )
}
