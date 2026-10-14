import mongoose from 'mongoose'

const eventStatusLogSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  oldStatus: { type: String },
  newStatus: { type: String },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  note: { type: String },
  createdAt: { type: Date, default: Date.now }
})

const EventStatusLog = mongoose.model('EventStatusLog', eventStatusLogSchema)
export default EventStatusLog
