import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { sendNotification } from '@/api/notifications.api'

function FAQItem({ q, a, open, onToggle }) {
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button onClick={onToggle} className="w-full flex items-start justify-between py-3 text-left hover:bg-gray-50 transition-colors rounded-lg px-2">
        <div className="pr-4 flex-1">
          <div className="font-semibold text-sm text-gray-800">{q}</div>
          <div className={`mt-2 text-xs text-gray-600 transition-all duration-300 overflow-hidden ${open ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>{a}</div>
        </div>
        <div className="ml-3 flex-shrink-0 text-gray-400">
          <svg className={`w-5 h-5 transform transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </button>
    </div>
  )
}

export default function StudentSupport() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState(null) 
  const [refId, setRefId] = useState(null)
  const [openFaq, setOpenFaq] = useState(0)

  const faqs = [
    { q: 'How do I book an event?', a: 'Open Browse Events, choose an event and click Book. You will receive a confirmation and a ticket in My Tickets.' },
    { q: 'How can I download my ticket?', a: 'Go to My Tickets → Details and click Download. Tickets are available in JSON/ICS formats.' },
    { q: 'Can I cancel my registration?', a: 'You can cancel from My Tickets if the event allows cancellations. Check the event policy for refund eligibility.' },
    { q: 'When will I receive a reply?', a: 'Our support team typically replies within 24–48 hours. For urgent matters email support@example.com.' },
  ]

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('sending')
    try {
      await sendNotification({ title: `Support request from ${name}`, body: message, email })
      const id = `SR-${Date.now().toString().slice(-6)}`
      setRefId(id)
      setStatus('sent')
      setName('')
      setEmail('')
      setMessage('')
    } catch (err) {
      setStatus('error')
    }
  }

  function toggleFaq(i) { setOpenFaq(openFaq === i ? -1 : i) }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/30 p-3 sm:p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 sm:mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Support</h2>
            <p className="text-sm text-gray-600 mt-1">Describe your issue and our team will get back to you. Include ticket references or screenshots when possible.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
              <div className="text-xs text-gray-500">Response time</div>
              <div className="text-sm font-semibold text-gray-900">Usually within 24–48 hours</div>
            </div>
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-2.5 rounded-xl font-medium shadow-md">Contact</div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 hover:shadow-md transition-shadow">
            {status === 'sending' && (
              <div className="mb-4 flex items-center gap-3 p-3 rounded bg-indigo-50 border border-indigo-100 text-indigo-700">
                <div className="w-5 h-5 animate-spin"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none"><path d="M12 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></div>
                <div className="text-sm">Sending your message…</div>
              </div>
            )}
            {status === 'sent' && (
              <div className="mb-4 flex items-start gap-3 p-3 rounded bg-green-50 border border-green-100 text-green-800">
                <div className="w-6 h-6"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                <div className="text-sm">Thanks — we received your request. Reference: <span className="font-medium">{refId}</span></div>
              </div>
            )}
            {status === 'error' && (
              <div className="mb-4 flex items-start gap-3 p-3 rounded bg-red-50 border border-red-100 text-red-800">
                <div className="w-6 h-6"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                <div className="text-sm">There was a problem sending your message. Try again or email <span className="font-medium">support@example.com</span>.</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Name</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none transition-all shadow-sm" disabled={status === 'sending'} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Email</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none transition-all shadow-sm" disabled={status === 'sending'} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Message</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe the issue, include ticket references or screenshots if available" className="w-full px-4 py-3 rounded-xl border border-gray-200 min-h-[140px] focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none transition-all shadow-sm" disabled={status === 'sending'} />
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button type="submit" disabled={status === 'sending'} className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white font-medium shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 ${status === 'sending' ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M2 12l19-9-9 19-2-7-8-3z" fill="currentColor"/></svg>
                  <span>{status === 'sending' ? 'Sending…' : 'Send Request'}</span>
                </button>
                <button type="button" onClick={() => { setName(''); setEmail(''); setMessage(''); setStatus(null) }} className="text-sm text-gray-600 hover:text-gray-900 font-medium px-4 py-2">Clear</button>
                <div className="sm:ml-auto text-xs text-gray-500 mt-2 sm:mt-0">Need faster support? Email <span className="font-medium text-indigo-600">support@example.com</span></div>
              </div>
            </form>
          </div>

          <aside className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 hover:shadow-md transition-shadow space-y-5">
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3">Contact & Hours</h3>
              <div className="text-xs text-gray-600 space-y-2">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  <span>support@example.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  <span>+1 (555) 123-4567</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>Mon–Fri, 9:00–18:00</span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <h4 className="text-sm font-bold text-gray-900 mb-3">Quick Links</h4>
              <ul className="text-xs text-gray-600 space-y-2">
                <li><Link className="text-indigo-600 hover:text-indigo-700 hover:underline font-medium" to="/student/tickets">My Tickets</Link></li>
                <li><Link className="text-indigo-600 hover:text-indigo-700 hover:underline font-medium" to="/student/events">My Events</Link></li>
                <li><Link className="text-indigo-600 hover:text-indigo-700 hover:underline font-medium" to="/student/payments">Payments & Invoices</Link></li>
              </ul>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <h4 className="text-sm font-bold text-gray-900 mb-3">FAQ</h4>
              <div className="text-sm text-gray-700">
                {faqs.map((f, i) => (
                  <FAQItem key={i} q={f.q} a={f.a} open={openFaq === i} onToggle={() => toggleFaq(i)} />
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
