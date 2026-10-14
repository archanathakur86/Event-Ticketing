import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'

// Ensure we load the backend/.env even when this script is executed from the repo root.
try {
  const envPath = new URL('../.env', import.meta.url).pathname
  dotenv.config({ path: envPath })
} catch (e) {
  // fallback to default
  dotenv.config()
}

import Log from '../src/models/Log.js'
import User from '../src/models/User.js'

const MONGO = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/ticketing'

async function connect() {
  await mongoose.connect(MONGO)
  console.log('Connected to MongoDB for logs seed:', MONGO)
}

async function seedLogs() {
  const users = await User.find({})
  if (!users || users.length === 0) {
    console.log('No users found. Run backend/scripts/seed.js first to create users.')
    return
  }

  const now = new Date()
  const entries = []
  // Create multiple login entries per user over the past few days
  for (const u of users) {
    // Add 3-5 login entries per user
    const loginCount = 3 + Math.floor(Math.random() * 3)
    for (let i = 0; i < loginCount; i++) {
      const daysAgo = Math.floor(Math.random() * 7)
      const hoursOffset = Math.floor(Math.random() * 24 * 60 * 60 * 1000)
      const loginTime = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000) - hoursOffset)
      
      entries.push({
        userId: u._id,
        type: 'login',
        message: 'User logged in',
        meta: { loginTime, status: 'Online' },
        createdAt: loginTime
      })
      
      // Add a logout entry for some logins
      if (Math.random() > 0.3) {
        const logoutTime = new Date(loginTime.getTime() + Math.floor(Math.random() * 4 * 60 * 60 * 1000))
        entries.push({
          userId: u._id,
          type: 'logout',
          message: 'User logged out',
          meta: { logoutTime, status: 'Offline' },
          createdAt: logoutTime
        })
      }
    }
  }

  const res = await Log.insertMany(entries)
  console.log('Inserted log entries:', res.length)
}

async function run() {
  try {
    await connect()
    await seedLogs()
    console.log('Seed logs finished')
    process.exit(0)
  } catch (e) {
    console.error('Seed logs error', e)
    process.exit(1)
  }
}

// ES module-safe entry
if (process.argv[1] === fileURLToPath(import.meta.url)) run()
