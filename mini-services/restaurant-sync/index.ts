import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

/**
 * Restaurant real-time sync hub.
 *
 * Channels (rooms):
 *   - "kitchen"  : all kitchen tablets join this room
 *   - "counter"  : all counter terminals join this room
 *
 * Event flow:
 *   Counter creates/sends KOT  -> emit `kot:new`          (kitchen listens)
 *   Counter updates order      -> emit `order:updated`    (both listen)
 *   Kitchen starts preparing   -> emit `item:status`      (counter listens)
 *   Kitchen marks item ready   -> emit `item:status`      (counter listens)
 *   Counter marks served       -> emit `item:status`      (kitchen listens)
 *   Counter clears bill        -> emit `table:released`   (kitchen listens)
 *   Counter adds new item      -> emit `kot:item-added`   (kitchen listens)
 *
 * `broadcast` sends to everyone in the room EXCEPT the sender, preventing echoes.
 */

const rooms = {
  kitchen: new Set<string>(),
  counter: new Set<string>(),
}

io.on('connection', (socket) => {
  console.log(`[sync] connected: ${socket.id}`)

  socket.on('join', (role: 'kitchen' | 'counter') => {
    if (role === 'kitchen') {
      socket.join('kitchen')
      rooms.kitchen.add(socket.id)
    } else {
      socket.join('counter')
      rooms.counter.add(socket.id)
    }
    console.log(`[sync] ${socket.id} joined ${role}`)
    socket.emit('joined', { role, online: rooms[role].size })
  })

  // ---------- KOT events ----------
  // Counter -> Kitchen: a new KOT was created
  socket.on('kot:new', (payload) => {
    socket.to('kitchen').emit('kot:new', payload)
    console.log(`[sync] kot:new -> kitchen`, payload?.orderId)
  })

  // Counter -> Kitchen: items added to an existing open KOT
  socket.on('kot:item-added', (payload) => {
    socket.to('kitchen').emit('kot:item-added', payload)
    console.log(`[sync] kot:item-added -> kitchen`, payload?.orderId)
  })

  // ---------- Item status events ----------
  // Kitchen -> Counter: item status changed (preparing / ready)
  // Counter -> Kitchen: item marked served / cancelled
  socket.on('item:status', (payload) => {
    // Send to the OTHER side. Kitchen sends -> counter. Counter sends -> kitchen.
    socket.to('counter').emit('item:status', payload)
    socket.to('kitchen').emit('item:status', payload)
    console.log(`[sync] item:status`, payload?.itemId, payload?.status)
  })

  // ---------- Order status events ----------
  socket.on('order:status', (payload) => {
    socket.to('counter').emit('order:status', payload)
    socket.to('kitchen').emit('order:status', payload)
    console.log(`[sync] order:status`, payload?.orderId, payload?.status)
  })

  // ---------- Table events ----------
  // Counter -> Kitchen: table released (bill paid)
  socket.on('table:released', (payload) => {
    socket.to('kitchen').emit('table:released', payload)
    console.log(`[sync] table:released -> kitchen`, payload?.tableNumber)
  })

  // Counter -> Kitchen: table occupied (new order started)
  socket.on('table:occupied', (payload) => {
    socket.to('kitchen').emit('table:occupied', payload)
    console.log(`[sync] table:occupied -> kitchen`, payload?.tableNumber)
  })

  // ---------- Generic data refresh ----------
  // E.g. menu changed, table list changed
  socket.on('data:refresh', (payload) => {
    socket.to('counter').emit('data:refresh', payload)
    socket.to('kitchen').emit('data:refresh', payload)
  })

  // ---------- Ping for connection health ----------
  socket.on('ping:client', () => {
    socket.emit('pong:server', { ts: Date.now() })
  })

  socket.on('disconnect', () => {
    rooms.kitchen.delete(socket.id)
    rooms.counter.delete(socket.id)
    console.log(`[sync] disconnected: ${socket.id}`)
  })

  socket.on('error', (err) => console.error(`[sync] socket error:`, err))
})

const PORT = 3005
httpServer.listen(PORT, () => {
  console.log(`[restaurant-sync] WebSocket hub running on port ${PORT}`)
})

process.on('SIGTERM', () => {
  httpServer.close(() => process.exit(0))
})
process.on('SIGINT', () => {
  httpServer.close(() => process.exit(0))
})
