import mongoose from 'mongoose'

const logSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  type: { type: String, required: true },
  message: { type: String, default: '' },
  meta: { type: Object, default: {} },
}, { timestamps: true })

const Log = mongoose.model('Log', logSchema)
export default Log
