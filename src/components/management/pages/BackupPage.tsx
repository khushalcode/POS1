'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Database, Download, Upload, AlertTriangle, CheckCircle2, Loader2, FileJson } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useShopFetch } from '@/hooks/use-shop-fetch'

export default function BackupPage() {
  const shopFetch = useShopFetch()
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [restoreFile, setRestoreFile] = useState<any>(null)
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await shopFetch('/api/backup')
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `servingsync-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Backup exported successfully')
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (!data.version) {
          toast.error('Invalid backup file')
          return
        }
        setRestoreFile({ data, name: file.name, size: (file.size / 1024).toFixed(1) })
        setShowRestoreConfirm(true)
      } catch {
        toast.error('Could not parse backup file')
      }
    }
    reader.readAsText(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRestore = async () => {
    if (!restoreFile) return
    setImporting(true)
    try {
      const res = await shopFetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(restoreFile.data),
      })
      if (!res.ok) throw new Error()
      toast.success('Backup restored successfully')
      setShowRestoreConfirm(false)
      setRestoreFile(null)
      setTimeout(() => window.location.reload(), 1500)
    } catch (e: any) {
      toast.error('Restore failed: ' + (e.message || ''))
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">Backup & Restore</h1>
        <p className="text-[10px] sm:text-sm text-slate-500">Export your database to JSON or restore from a previous backup</p>
      </div>

      {/* Backup actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Export */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-0 shadow-md rounded-2xl overflow-hidden h-full">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Export Backup</h3>
                  <p className="text-xs text-slate-500">Save all data to a JSON file</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                Exports menu, tables, orders, bills, customers, suppliers, purchases, expenses,
                money in/out, and settings. User passwords are excluded for security.
              </p>
              <Button
                onClick={handleExport}
                disabled={exporting}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}
                Download Backup
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Import */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-0 shadow-md rounded-2xl overflow-hidden h-full">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Restore Backup</h3>
                  <p className="text-xs text-slate-500">Replace current data with backup</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                Restore from a previously exported JSON file. <strong className="text-rose-600">Warning:</strong> this
                replaces ALL current data. Make sure to export a fresh backup first.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleFilePick}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                variant="outline"
                className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                {importing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
                Select Backup File
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Info card */}
      <Card className="border-0 shadow-md rounded-2xl bg-blue-50/50 border-blue-200">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5 text-blue-700" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm text-slate-900 mb-1">How backups work</h4>
              <ul className="text-xs text-slate-600 space-y-1 list-disc pl-4">
                <li>Backups are stored as plain JSON — readable in any text editor</li>
                <li>Includes all restaurant data: menu, orders, bills, customers, suppliers, etc.</li>
                <li>For security, user passwords are NOT included in exports</li>
                <li>Restore wipes current data and replaces with the backup file</li>
                <li>Recommended: export a backup weekly and before any major changes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Restore confirm dialog */}
      <Dialog open={showRestoreConfirm} onOpenChange={(o) => { if (!o) { setRestoreFile(null); setShowRestoreConfirm(false) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Confirm Restore
            </DialogTitle>
          </DialogHeader>
          {restoreFile && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                <FileJson className="w-8 h-8 text-amber-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{restoreFile.name}</p>
                  <p className="text-xs text-slate-500">{restoreFile.size} KB · Exported {restoreFile.data.exportedAt ? new Date(restoreFile.data.exportedAt).toLocaleString() : 'unknown'}</p>
                </div>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                <p className="text-xs text-rose-700">
                  <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                  This will <strong>permanently delete</strong> all current data and replace it with the backup. This cannot be undone.
                </p>
              </div>
              <div className="text-xs text-slate-600">
                <p className="font-medium mb-1">Backup contains:</p>
                <ul className="grid grid-cols-2 gap-1 ml-4 list-disc">
                  <li>{restoreFile.data.menuItems?.length || 0} menu items</li>
                  <li>{restoreFile.data.bills?.length || 0} bills</li>
                  <li>{restoreFile.data.orders?.length || 0} orders</li>
                  <li>{restoreFile.data.tables?.length || 0} tables</li>
                  <li>{restoreFile.data.customers?.length || 0} customers</li>
                  <li>{restoreFile.data.suppliers?.length || 0} suppliers</li>
                </ul>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button variant="destructive" onClick={handleRestore} disabled={importing}>
              {importing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              Restore Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
