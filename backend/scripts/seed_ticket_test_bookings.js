import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

// Load backend/.env reliably
try {
  const envPath = new URL('../.env', import.meta.url).pathname
  dotenv.config({ path: envPath })
} catch {
  dotenv.config()
}

import User from '../src/models/User.js'
import Event from '../src/models/Event.js'
import Ticket from '../src/models/Ticket.js'
import Payment from '../src/models/Payment.js'

const MONGO =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.DATABASE_URL ||
  'mongodb://localhost:27017/ticketing'

const DEFAULT_EVENT_NAME = 'Hackathon for 48hrs'

function parseArgs() {
  const args = process.argv.slice(2)
  const get = (key, fallback = '') => {
    const idx = args.indexOf(key)
    return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback
  }
  return {
    eventName: get('--event', DEFAULT_EVENT_NAME),
    reset: args.includes('--reset'),
  }
}

async function connect() {
  await mongoose.connect(MONGO)
  console.log('Connected to MongoDB:', MONGO)
}

async function resolveAdminCreator() {
  const admin = await User.findOne({ role: { $in: ['super admin', 'administration'] } })
  if (admin) return admin

  const fallback = new User({
    fullName: 'System Admin',
    email: 'system.admin@confnow.com',
    passwordHash: 'Admin@123',
    role: 'super admin',
    status: 'active',
  })
  await fallback.save()
  return fallback
}

async function resolveEvent(adminUser, eventName) {
  let event = await Event.findOne({ event_name: eventName })
  if (event) return event

  event = new Event({
    event_name: eventName,
    event_description: 'Test event for validating ticket management flows',
    event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    location: 'Seminar Hall A',
    capacity: 34,
    price: 499,
    status: 'Published',
    isActive: true,
    created_by: adminUser._id,
  })
  await event.save()
  console.log('Created event:', event.event_name)
  return event
}

async function ensureStudent(fullName, email) {
  let user = await User.findOne({ email })
  if (user) return user

  user = new User({
    fullName,
    email,
    passwordHash: 'Student@123',
    role: 'student',
    status: 'active',
  })
  await user.save()
  return user
}

function makeTicketCode(index) {
  const stamp = Date.now().toString(36).toUpperCase()
  return `TST-${stamp}-${String(index + 1).padStart(2, '0')}`
}

function mapStatuses(index) {
  // 3 booked, 1 pending, 1 cancelled
  if (index <= 2) {
    return { ticketStatus: 'booked', ticketPaymentStatus: 'paid', paymentStatus: 'success' }
  }
  if (index === 3) {
    return { ticketStatus: 'pending', ticketPaymentStatus: 'pending', paymentStatus: 'pending' }
  }
  return { ticketStatus: 'cancelled', ticketPaymentStatus: 'failed', paymentStatus: 'failed' }
}

async function clearPreviousTestData(eventId) {
  const testUsers = await User.find({ email: /test\.ticket\d+@confnow\.com/i }).select('_id')
  const userIds = testUsers.map(u => u._id)

  const delPayments = await Payment.deleteMany({ event_id: eventId, user_id: { $in: userIds } })
  const delTickets = await Ticket.deleteMany({ event_id: eventId, user_id: { $in: userIds } })

  console.log(`Reset done. Deleted ${delTickets.deletedCount} test tickets and ${delPayments.deletedCount} test payments.`)
}

async function seedBookings(event) {
  const buyers = [
    { fullName: 'Aarav Sharma', email: 'test.ticket1@confnow.com' },
    { fullName: 'Siya Patel', email: 'test.ticket2@confnow.com' },
    { fullName: 'Kabir Verma', email: 'test.ticket3@confnow.com' },
    { fullName: 'Ananya Singh', email: 'test.ticket4@confnow.com' },
    { fullName: 'Rohan Gupta', email: 'test.ticket5@confnow.com' },
  ]

  let created = 0
  let updated = 0

  for (let i = 0; i < buyers.length; i++) {
    const b = buyers[i]
    const user = await ensureStudent(b.fullName, b.email)
    const { ticketStatus, ticketPaymentStatus, paymentStatus } = mapStatuses(i)

    let ticket = await Ticket.findOne({ user_id: user._id, event_id: event._id })
    const ticketPayload = {
      user_id: user._id,
      event_id: event._id,
      ticket_type: i % 2 === 0 ? 'regular' : 'vip',
      ticket_code: ticket?.ticket_code || makeTicketCode(i),
      qr_code:
        ticketStatus === 'booked'
          ? JSON.stringify({
              ticket_code: ticket?.ticket_code || makeTicketCode(i),
              event_id: event._id,
              user_id: user._id,
            })
          : null,
      status: ticketStatus,
      payment_status: ticketPaymentStatus,
      price: Number(event.price || 0),
      is_assigned: true,
    }

    if (!ticket) {
      ticket = await Ticket.create(ticketPayload)
      created += 1
    } else {
      Object.assign(ticket, ticketPayload)
      await ticket.save()
      updated += 1
    }

    const payuTxn = `TEST-${Date.now()}-${i}-${randomUUID().slice(0, 6)}`
    const txn = `MID-${Date.now()}-${i}`

    const existingPayment = await Payment.findOne({ ticket_id: ticket._id })
    if (!existingPayment) {
      await Payment.create({
        ticket_id: ticket._id,
        user_id: user._id,
        event_id: event._id,
        payment_gateway: 'Manual',
        transaction_id: paymentStatus === 'success' ? txn : undefined,
        payu_txnid: payuTxn,
        amount: Number(event.price || 0),
        payment_status: paymentStatus,
        payment_response: { source: 'seed_ticket_test_bookings.js' },
        payment_date: paymentStatus === 'success' ? new Date() : null,
      })
    } else {
      existingPayment.payment_gateway = 'Manual'
      existingPayment.transaction_id = paymentStatus === 'success' ? txn : null
      existingPayment.amount = Number(event.price || 0)
      existingPayment.payment_status = paymentStatus
      existingPayment.payment_response = { source: 'seed_ticket_test_bookings.js' }
      existingPayment.payment_date = paymentStatus === 'success' ? new Date() : null
      // keep existing unique payu_txnid stable
      await existingPayment.save()
    }
  }

  console.log(`Seed bookings complete: created ${created}, updated ${updated}`)

  const total = await Ticket.countDocuments({ event_id: event._id })
  const booked = await Ticket.countDocuments({ event_id: event._id, status: 'booked' })
  const pending = await Ticket.countDocuments({ event_id: event._id, status: 'pending' })
  const cancelled = await Ticket.countDocuments({ event_id: event._id, status: 'cancelled' })

  console.log('----- Event Ticket Summary -----')
  console.log('Event:', event.event_name)
  console.log('Total:', total)
  console.log('Booked:', booked)
  console.log('Pending:', pending)
  console.log('Cancelled:', cancelled)
}

async function run() {
  const { eventName, reset } = parseArgs()
  try {
    await connect()
    const admin = await resolveAdminCreator()
    const event = await resolveEvent(admin, eventName)

    if (reset) {
      await clearPreviousTestData(event._id)
    }

    await seedBookings(event)
    process.exit(0)
  } catch (e) {
    console.error('seed_ticket_test_bookings error:', e)
    process.exit(1)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run()
}
