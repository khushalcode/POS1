'use client'

import { getSupabase } from './supabase'
import { syncQueue } from './client-data'

/**
 * SyncManager — drains the outbox to Supabase when online
 *
 * Architecture:
 * 1. Counter creates KOT → saves to local SQLite → adds to SyncOutbox
 * 2. SyncManager checks every 10s if online
 * 3. If online → pushes pending outbox entries to Supabase kot_events table
 * 4. Kitchen device subscribes to Supabase Realtime on kot_events
 * 5. Kitchen receives KOT instantly
 *
 * If offline: KOTs stay in outbox until internet returns
 */

let syncInterval: any = null
let isSyncing = false

export function startSyncManager() {
  if (syncInterval) return
  // Check every 10 seconds
  syncInterval = setInterval(drainOutbox, 10_000)
  // Also drain immediately
  drainOutbox()
  // Drain when coming back online
  window.addEventListener('online', drainOutbox)
}

export function stopSyncManager() {
  if (syncInterval) { clearInterval(syncInterval); syncInterval = null }
  window.removeEventListener('online', drainOutbox)
}

async function drainOutbox() {
  if (isSyncing) return
  if (!navigator.onLine) return

  const supabase = getSupabase()
  if (!supabase) return

  isSyncing = true
  try {
    const pending = syncQueue.getPending()
    for (const item of pending) {
      try {
        const payload = JSON.parse(item.payload)
        const { error } = await supabase
          .from('kot_events')
          .insert({
            event_type: item.eventType,
            payload: payload,
            created_at: new Date().toISOString(),
          })
        if (error) {
          syncQueue.markFailed(item.id)
        } else {
          syncQueue.markSynced(item.id)
        }
      } catch {
        syncQueue.markFailed(item.id)
      }
    }
  } finally {
    isSyncing = false
  }
}
