import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
dotenv.config()

import User from '../src/models/User.js'
import Event from '../src/models/Event.js'
import Ticket from '../src/models/Ticket.js'
import Payment from '../src/models/Payment.js'

// Accept multiple possible env var names for Mongo URI
const MONGO = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/ticketing'

async function connect() {
  await mongoose.connect(MONGO)
  console.log('Connected to MongoDB:', MONGO)
}

async function createUsers() {
  console.log('Creating users...')
  const users = [
    { fullName: 'Super Admin', email: 'admin@confnow.com', passwordHash: 'Admin@123', role: 'super admin' },
    { fullName: 'Coordinator', email: 'coordinator@confnow.com', passwordHash: 'Coord@123', role: 'coordinator' },
    { fullName: 'Administration', email: 'adminstaff@confnow.com', passwordHash: 'AdminStaff@123', role: 'administration' },
  ]

  for (const u of users) {
    const existing = await User.findOne({ email: u.email })
    if (!existing) {
      const user = new User({ fullName: u.fullName, email: u.email, passwordHash: u.passwordHash, role: u.role })
      await user.save()
      console.log('Created user', u.email)
    } else {
      console.log('User exists', u.email)
    }
  }
}

async function createEvents() {
  console.log('Creating sample events...')
  const coords = await User.find({ role: 'coordinator' })
  const coordId = coords && coords[0] ? coords[0]._id : null

  const samples = [
    {
      event_name: 'Campus Orientation',
      event_description: 'Welcome to the new semester - orientation event',
      event_date: new Date(Date.now() + 86400 * 1000 * 7),
      location: 'Main Hall',
      capacity: 200,
      price: 0,
      status: 'published',
      isActive: true,
      created_by: coords && coords[0]? coords[0]._id : undefined,
      assigned_to: coordId ? [coordId] : [],
    },
    {
      event_name: 'Research Seminar (Draft)',
      event_description: 'Internal seminar - draft',
      event_date: new Date(Date.now() + 86400 * 1000 * 14),
      location: 'Room 101',
      capacity: 50,
      price: 0,
      status: 'draft',
      isActive: false,
      created_by: coords && coords[0]? coords[0]._id : undefined,
      assigned_to: coordId ? [coordId] : [],
    },
    {
      event_name: 'Annual Tech Conference',
      event_description: 'Public tech conference',
      event_date: new Date(Date.now() + 86400 * 1000 * 30),
      location: 'Conference Center',
      capacity: 500,
      price: 100,
      status: 'published',
      isActive: true,
      created_by: coords && coords[0]? coords[0]._id : undefined,
      assigned_to: [],
    }
  ]

  for (const s of samples) {
    const exists = await Event.findOne({ event_name: s.event_name })
    if (!exists) {
      const e = new Event(s)
      await e.save()
      console.log('Created event', s.event_name)
    } else {
      console.log('Event exists', s.event_name)
    }
  }
}

async function migrateStatuses() {
  console.log('Migrating events without status -> setting to published')
  const res = await Event.updateMany({ status: { $exists: false } }, { $set: { status: 'published', isActive: true } })
  console.log('Migrated', res.modifiedCount || res.nModified || 0)
}

async function clearDemoData() {
  console.log('Clearing all demo tickets and payments...')
  
  const ticketResult = await Ticket.deleteMany({})
  console.log(`Deleted ${ticketResult.deletedCount} tickets`)
  
  const paymentResult = await Payment.deleteMany({})
  console.log(`Deleted ${paymentResult.deletedCount} payments`)
  
  console.log('Demo data cleared successfully!')
}

async function run() {
  try {
    await connect()
    
    // Check if user wants to clear demo data
    const args = process.argv.slice(2)
    if (args.includes('--clear')) {
      await clearDemoData()
      console.log('Clear operation finished')
      process.exit(0)
      return
    }
    
    await createUsers()
    await createEvents()
    await migrateStatuses()
    console.log('Seed finished')
    process.exit(0)
  } catch (e) {
    console.error('Seed error', e)
    process.exit(1)
  }
}

// ES module-safe entry check
if (process.argv[1] === fileURLToPath(import.meta.url)) run()
