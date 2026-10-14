import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function HowItWorksPage() {
  const navigate = useNavigate()

  const steps = [
    {
      title: 'Discover Events',
      desc: 'Browse upcoming events by category, date, and location to find what matches your interests.'
    },
    {
      title: 'Choose Your Tickets',
      desc: 'Select ticket type, quantity, and seating options (if available) in a few clicks.'
    },
    {
      title: 'Secure Checkout',
      desc: 'Complete payment with a safe checkout process and instant booking confirmation.'
    },
    {
      title: 'Get Your E-Ticket',
      desc: 'Receive your ticket instantly and use it at entry with quick verification.'
    }
  ]

  const highlights = [
    {
      title: 'Fast Booking',
      desc: 'Reserve your spot in under two minutes with a clean and guided flow.'
    },
    {
      title: 'Reliable Payments',
      desc: 'Secure transaction flow with instant confirmation and status tracking.'
    },
    {
      title: 'Smart Entry',
      desc: 'E-ticket and quick validation for smooth check-in at the venue gate.'
    }
  ]

  const faqs = [
    {
      q: 'Can I cancel a ticket after booking?',
      a: 'Cancellation depends on organizer policy. You can check terms before payment.'
    },
    {
      q: 'When do I receive my ticket?',
      a: 'Immediately after successful payment. It appears in your account and confirmation mail.'
    },
    {
      q: 'Do I need to print my ticket?',
      a: 'No. A digital ticket on your phone is enough for entry in most events.'
    }
  ]

  const benefits = [
    { icon: '⚡', title: 'Lightning Fast', desc: 'From search to booking in seconds' },
    { icon: '🔒', title: 'Totally Secure', desc: 'Bank-level encryption & fraud protection' },
    { icon: '📱', title: 'Mobile First', desc: 'Seamless experience on any device' },
    { icon: '🌍', title: 'Global Reach', desc: 'Events and payments worldwide' }
  ]

  const stats = [
    { number: '50K+', label: 'Events Hosted' },
    { number: '2M+', label: 'Attendees Served' },
    { number: '4.9★', label: 'User Rating' }
  ]

  return (
    <div className="min-h-screen bg-[#fcfcff]">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes softFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes subtleGlow {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.55; }
        }
        @keyframes gradientDrift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes gentlePulse {
          0%, 100% { transform: scale(1); opacity: .45; }
          50% { transform: scale(1.08); opacity: .75; }
        }
        @keyframes revealLTR {
          from { opacity: 0; transform: translateX(-18px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .fade-up {
          animation: fadeUp 700ms cubic-bezier(.22,.61,.36,1) both;
        }
        .float-soft {
          animation: softFloat 5s ease-in-out infinite;
        }
        .soft-glow {
          animation: subtleGlow 3.2s ease-in-out infinite;
        }
        .gradient-drift {
          background-size: 200% 200%;
          animation: gradientDrift 12s ease infinite;
        }
        .pulse-dot {
          animation: gentlePulse 2.8s ease-in-out infinite;
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        @keyframes countUp {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes underlineExpand {
          from { width: 0; }
          to { width: 100%; }
        }
        @keyframes textGlow {
          0%, 100% { text-shadow: 0 0 10px rgba(59, 130, 246, 0); }
          50% { text-shadow: 0 0 15px rgba(59, 130, 246, 0.4); }
        }
        .bounce-in {
          animation: bounce 2.5s ease-in-out infinite;
        }
        .scale-in {
          animation: scaleIn 600ms cubic-bezier(.22,.61,.36,1) both;
        }
        .shimmer-effect {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.3), transparent);
          background-size: 1000px 100%;
          animation: shimmer 2.5s infinite;
        }
        .count-up {
          animation: countUp 700ms ease-out both;
        }
        .text-glow {
          animation: textGlow 3s ease-in-out infinite;
        }
        .underline-expand::after {
          content: '';
          display: block;
          height: 2px;
          background: linear-gradient(90deg, #3b82f6, #6366f1);
          animation: underlineExpand 700ms cubic-bezier(.22,.61,.36,1) both;
          margin-top: 6px;
        }
        .slide-in-up {
          animation: slideInUp 650ms cubic-bezier(.22,.61,.36,1) both;
        }
        .reveal-ltr {
          animation: revealLTR 700ms cubic-bezier(.22,.61,.36,1) both;
        }
        .hover-rise {
          transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease;
        }
        .hover-rise:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
          border-color: #bfdbfe;
        }
        @keyframes navUnderline {
          from { width: 0; }
          to { width: 100%; }
        }
        .nav-link {
          position: relative;
          display: inline-block;
        }
        .nav-link::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          width: 0;
          height: 2px;
          background: linear-gradient(90deg, #3b82f6, #6366f1);
          transition: width 300ms cubic-bezier(.22,.61,.36,1);
        }
        .nav-link:hover::after {
          width: 100%;
        }
      `}</style>

      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-blue-900 rounded-md flex items-center justify-center group-hover:bg-blue-800 transition-colors">
              <span className="text-white font-bold">K</span>
            </div>
            <span className="font-bold text-gray-900">ConfNow</span>
          </button>

          <nav className="hidden md:flex items-center gap-8 absolute left-1/2 transform -translate-x-1/2">
            <button onClick={() => navigate('/')} className="nav-link text-gray-600 hover:text-gray-900 text-lg font-medium transition-colors">Home</button>
            <button onClick={() => navigate('/about')} className="nav-link text-gray-600 hover:text-gray-900 text-lg font-medium transition-colors">About</button>
            <button onClick={() => navigate('/events')} className="nav-link text-gray-600 hover:text-gray-900 text-lg font-medium transition-colors">Events</button>
            <button onClick={() => navigate('/how-it-works')} className="nav-link text-blue-900 text-lg font-semibold">How It Works</button>
            <button onClick={() => navigate('/contact')} className="nav-link text-gray-600 hover:text-gray-900 text-lg font-medium transition-colors">Contact</button>
          </nav>

          <button onClick={() => navigate('/register')} className="px-5 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 text-base font-semibold transition-all shadow-sm hover:shadow-md">
            Get Started
          </button>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-gray-100 bg-gradient-to-br from-[#eef2ff] via-[#fdf2f8] to-[#ecfeff] gradient-drift">
        <div className="absolute -top-16 -left-16 w-52 h-52 rounded-full bg-blue-100/80 blur-3xl soft-glow pointer-events-none" />
        <div className="absolute top-8 right-6 w-40 h-40 rounded-full bg-indigo-100/80 blur-3xl float-soft pointer-events-none" style={{ animationDelay: '400ms' }} />
        <div className="absolute bottom-8 left-[42%] w-20 h-20 rounded-full bg-pink-100/70 blur-2xl pulse-dot pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <p className="inline-block px-3 py-1 bg-blue-50 text-blue-900 text-xs font-semibold rounded-full mb-5 fade-up">Simple Process</p>
          <h1 className="text-4xl sm:text-5xl font-light text-gray-900 leading-tight mb-4 fade-up" style={{ animationDelay: '80ms' }}>
            How ConfNow
            <span className="font-semibold text-blue-900"> Works</span>
          </h1>
          <p className="text-gray-600 text-lg max-w-3xl fade-up" style={{ animationDelay: '140ms' }}>
            From finding an event to entering the venue, everything is designed to be quick, secure, and smooth.
          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {highlights.map((item, idx) => (
              <div
                key={item.title}
                className={`rounded-xl border border-white/70 p-4 shadow-sm backdrop-blur-sm hover-rise reveal-ltr ${
                  idx === 0
                    ? 'bg-[#eef4ff]'
                    : idx === 1
                      ? 'bg-[#fff4ec]'
                      : 'bg-[#effcf6]'
                }`}
                style={{ animationDelay: `${220 + idx * 120}ms` }}
              >
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-light text-gray-900 mb-2 fade-up" style={{ animationDelay: '200ms' }}>Step-by-step journey</h2>
          <p className="text-gray-600 fade-up" style={{ animationDelay: '280ms' }}>A clear path from discovery to event entry.</p>
        </div>

        <div className="relative">
          <div className="hidden md:block absolute left-1/2 top-0 -translate-x-1/2 h-full w-px bg-gradient-to-b from-blue-100 via-indigo-100 to-pink-100" />

          <div className="grid gap-6 md:grid-cols-2">
          {steps.map((step, idx) => (
            <article
              key={step.title}
              className={`rounded-2xl border p-6 shadow-sm fade-up hover-rise scale-in relative group ${
                idx % 2 === 0
                  ? 'bg-[#f8faff] border-blue-100 md:mr-6'
                  : 'bg-[#fffaf5] border-orange-100 md:ml-6'
              }`}
              style={{ animationDelay: `${idx * 90}ms` }}
            >
              <div className="shimmer-effect absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
              <div className="w-10 h-10 rounded-lg bg-blue-900 text-white font-semibold flex items-center justify-center mb-4 relative z-10 scale-in" style={{ animationDelay: `${idx * 90 + 100}ms` }}>
                {idx + 1}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 relative z-10" style={{ animationDelay: `${idx * 90 + 150}ms` }}>{step.title}</h3>
              <p className="text-gray-600 leading-relaxed relative z-10">{step.desc}</p>
            </article>
          ))}
          </div>
        </div>

        {/* Why ConfNow Section */}
        <div className="mt-14 mb-14">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-light text-gray-900 mb-3 fade-up" style={{ animationDelay: '200ms' }}>Why ConfNow Stands Out</h2>
            <p className="text-gray-600 fade-up" style={{ animationDelay: '280ms' }}>Built with attendees and organizers in mind</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
            {benefits.map((item, idx) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/60 p-6 text-center bg-gradient-to-br from-blue-50/40 to-indigo-50/40 slide-in-up hover-rise scale-in group relative overflow-hidden"
                style={{ animationDelay: `${160 + idx * 100}ms` }}
              >
              <div className="shimmer-effect absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
              <div className="text-4xl mb-3 inline-block bounce-in">{item.icon}</div>
              <h4 className="text-sm font-semibold text-gray-900 mb-1 relative z-10">{item.title}</h4>
                <p className="text-xs text-gray-600 relative z-10">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-14 mb-14 rounded-3xl border border-gray-100 bg-gradient-to-br from-blue-50/60 to-purple-50/40 p-8 md:p-12 fade-up">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-light text-gray-900 mb-2">Trusted Globally</h2>
            <p className="text-gray-600 text-sm fade-up" style={{ animationDelay: '150ms' }}>Join millions of users discovering and attending amazing events</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {stats.map((stat, idx) => (
              <div
                key={stat.label}
                className="text-center p-6 rounded-xl bg-white/60 backdrop-blur-sm border border-white/90 fade-up scale-in hover-rise group relative overflow-hidden"
                style={{ animationDelay: `${480 + idx * 100}ms` }}
              >
                <div className="shimmer-effect absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="text-5xl font-bold bg-gradient-to-r from-blue-900 to-indigo-600 bg-clip-text text-transparent mb-2 count-up relative z-10">
                  {stat.number}
                </div>
                <p className="text-sm text-gray-600 font-medium relative z-10">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mt-10">
          <div className="rounded-2xl border border-[#dbeafe] p-6 bg-[#eff6ff] fade-up hover-rise">
            <p className="text-xs font-semibold tracking-wider text-blue-900 uppercase mb-2">For Attendees</p>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Find, book, and attend without friction</h3>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li>• Search by event type, date, and venue</li>
              <li>• Compare ticket options and pricing</li>
              <li>• Access tickets instantly after checkout</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[#fbcfe8] p-6 bg-[#fdf2f8] fade-up hover-rise" style={{ animationDelay: '80ms' }}>
            <p className="text-xs font-semibold tracking-wider text-blue-900 uppercase mb-2">For Organizers</p>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Publish and manage events confidently</h3>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li>• Create events with flexible ticket tiers</li>
              <li>• Track attendance and booking trends</li>
              <li>• Manage operations from one dashboard</li>
            </ul>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-2xl sm:text-3xl font-light text-gray-900 mb-6 fade-up" style={{ animationDelay: '200ms' }}>Quick FAQs</h2>
          <div className="space-y-4">
            {faqs.map((item, idx) => (
              <div
                key={item.q}
                className="rounded-xl border border-gray-200 p-5 bg-gradient-to-r from-white to-[#f8fafc] fade-up hover-rise"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
              <h4 className="text-base font-semibold text-gray-900 mb-1 text-glow">{item.q}</h4>
                <p className="text-sm text-gray-600">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 rounded-2xl bg-blue-900 text-white p-8 sm:p-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 fade-up hover-rise">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Ready to book your next event?</h2>
            <p className="text-blue-100">Explore live events and reserve your seat in minutes.</p>
          </div>
          <button
            onClick={() => navigate('/events')}
            className="px-6 py-3 rounded-xl bg-white text-blue-900 font-semibold hover:bg-blue-50 hover:-translate-y-0.5 transition-all"
          >
            Browse Events
          </button>
        </div>
      </section>
    </div>
  )
}
