import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
dotenv.config()

import Event from '../src/models/Event.js'
import User from '../src/models/User.js'

const MONGO = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/ticketing'

async function run() {
  try {
    await mongoose.connect(MONGO)
    console.log('Connected to Mongo:', MONGO)

    const events = await Event.find().sort({ created_at: -1 }).limit(50).populate('coordinator_id', 'fullName email role').lean()
    console.log('Events (showing coordinator assignment):')
    for (const ev of events) {
      console.log('---')
      console.log('id:', ev._id)
      console.log('name:', ev.event_name)
      console.log('coordinator_id raw:', ev.coordinator_id)
      if (ev.coordinator_id && typeof ev.coordinator_id === 'object') {
        console.log('coordinator:', ev.coordinator_id.fullName, ev.coordinator_id.email, ev.coordinator_id.role)
      }
    }

    const coords = await User.find({ role: 'coordinator' }).lean()
    console.log('\nCoordinators in DB:')
    for (const c of coords) {
      console.log(c._id.toString(), c.fullName, c.email, c.role)
    }

    await mongoose.disconnect()
    process.exit(0)
  } catch (e) {
    console.error('Inspect error', e)
    process.exit(1)
  }
}

run()
