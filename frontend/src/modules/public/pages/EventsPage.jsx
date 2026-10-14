import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from '@/api/auth.api'
import eventService, { getAllEventsRaw, mapServerEvent } from '@/api/events.api'
import { FaSearch, FaMapMarkerAlt, FaClock, FaArrowRight, FaCalendarAlt } from 'react-icons/fa'

export default function EventsPage() {
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const raw = await getAllEventsRaw()
        let arr = []
        if (Array.isArray(raw)) arr = raw
        else if (raw && Array.isArray(raw.events)) arr = raw.events
        else if (raw && Array.isArray(raw.data)) arr = raw.data
        else if (raw && Array.isArray(raw.payload)) arr = raw.payload
        else arr = []
        const mapped = (arr || []).map(mapServerEvent)
        if (!mounted) return
        setEvents(mapped || [])
      } catch (err) {
        console.error('Failed to load events', err)
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  async function handleOpenEvent(id) {
    try {
      const user = await getCurrentUser()
      if (!user) {
        setShowAuthModal(true)
        return
      }
      navigate(`/events/${id}`)
    } catch (err) {
      navigate(`/events/${id}`)
    }
  }

  const categories = [
    { id: 'all', label: 'All Events' },
    { id: 'webinars', label: 'Webinars' },
    { id: 'conference', label: 'Conference' },
    { id: 'feast', label: 'Event Feast' },
    { id: 'meetups', label: 'Community Meetups' },
    { id: 'festivals', label: 'Festivals' }
  ]

  // Filter out cancelled events and show only published ones
  const publishedEvents = events.filter(ev => {
    const status = String(ev.status || '').toLowerCase()
    return (status === 'published' || !ev.status) && status !== 'cancelled'
  })

  const filteredByCategory = selectedCategory === 'all' 
    ? publishedEvents 
    : publishedEvents.filter(ev => (ev.category?.toLowerCase() || '').includes(selectedCategory))

  const filteredEvents = filteredByCategory.filter(ev =>
    searchTerm === '' ? true : 
    (ev.title?.toLowerCase() || ev.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (ev.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (ev.location?.toLowerCase() || ev.venue?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-white">
      <style>{`
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
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes textGlow {
          0%, 100% { text-shadow: 0 0 10px rgba(59, 130, 246, 0); }
          50% { text-shadow: 0 0 15px rgba(59, 130, 246, 0.4); }
        }
        .fade-up {
          animation: fadeUp 700ms cubic-bezier(.22,.61,.36,1) both;
        }
        .text-glow {
          animation: textGlow 3s ease-in-out infinite;
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes textReveal {
          from { clip-path: inset(0 100% 0 0); }
          to { clip-path: inset(0 0 0 0); }
        }
        .slide-in-up {
          animation: slideInUp 600ms cubic-bezier(.22,.61,.36,1) both;
        }
        .text-reveal {
          animation: textReveal 1s cubic-bezier(.22,.61,.36,1) both;
        }
      `}</style>
      {/* Header */}
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
            <button onClick={() => navigate('/events')} className="nav-link text-gray-600 hover:text-gray-900 text-lg font-medium transition-colors">Events</button>
            <button onClick={() => navigate('/about')} className="nav-link text-gray-600 hover:text-gray-900 text-lg font-medium transition-colors">About</button>
            <button onClick={() => navigate('/how-it-works')} className="nav-link text-gray-600 hover:text-gray-900 text-lg font-medium transition-colors">How It Works</button>
            <button onClick={() => navigate('/contact')} className="nav-link text-gray-600 hover:text-gray-900 text-lg font-medium transition-colors">Contact</button>
          </nav>

          <button onClick={() => navigate('/register')} className="px-5 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 text-lg font-semibold transition-all shadow-sm hover:shadow-md">
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full mb-6 fade-up">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
              <span className="text-blue-900 text-xs font-semibold uppercase tracking-wider">Live Events</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-light text-gray-900 mb-4 leading-tight">
              <span className="text-reveal inline-block">Discover Your Next</span><br />
              <span className="font-semibold text-blue-900 text-reveal inline-block" style={{ animationDelay: '200ms' }}>Experience</span>
            </h1>
            <p className="text-gray-600 text-lg mb-8 leading-relaxed fade-up" style={{ animationDelay: '160ms' }}>
              Browse curated events from concerts to conferences. Find what moves you.
            </p>

            {/* Search Bar */}
            <div className="relative">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by event name, artist, or venue..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                className="w-full pl-11 pr-24 py-3.5 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 shadow-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-16 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => {}}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors font-medium text-sm"
              >
                Search
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Category Pills */}
      <div className="border-b border-gray-100 bg-white sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-3 py-5 overflow-x-auto scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-5 py-2.5 rounded-lg font-medium whitespace-nowrap transition-all text-sm ${
                  selectedCategory === cat.id
                    ? 'bg-blue-900 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Events Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <div className="w-12 h-12 border-3 border-gray-200 border-t-blue-900 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500 font-medium">Loading events...</p>
            </div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaSearch className="text-gray-400 text-xl" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-600">Try adjusting your search or browse all categories</p>
          </div>
        ) : (
          <>
            {/* Results Count */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 fade-up">Upcoming Events</h2>
                <p className="text-gray-600 text-sm mt-1 fade-up" style={{ animationDelay: '80ms' }}>{filteredEvents.length} events available</p>
              </div>
            </div>

            {/* Events Grid */}
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map((ev, idx) => (
                <article
                  key={ev.id}
                  onClick={() => handleOpenEvent(ev.id)}
                  className="group cursor-pointer slide-in-up"
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  {/* Event Image */}
                  <div className="relative h-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden mb-4 shadow-md group-hover:shadow-xl transition-shadow duration-300">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                    
                    {/* Decorative Pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                          <pattern id={`pattern-${idx}`} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                            <circle cx="10" cy="10" r="1.5" fill="currentColor" />
                          </pattern>
                        </defs>
                        <rect width="100" height="100" fill={`url(#pattern-${idx})`} />
                      </svg>
                    </div>

                    {/* Badge */}
                    <div className="absolute top-4 left-4">
                      <span className="inline-block px-3 py-1 bg-white/95 backdrop-blur-sm rounded-full text-xs font-semibold text-gray-900 shadow-lg">
                        Featured Event
                      </span>
                    </div>

                    {/* Date Badge */}
                    {ev.date && (
                      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
                        <p className="text-xs text-gray-600 font-medium">
                          {new Date(ev.date).toLocaleDateString('en-US', { month: 'short' })}
                        </p>
                        <p className="text-xl font-bold text-gray-900">
                          {new Date(ev.date).getDate()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Event Info */}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-900 transition-colors">
                      {ev.title || ev.name}
                    </h3>

                    <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-2">
                      {ev.description}
                    </p>

                    {/* Meta Information */}
                    <div className="space-y-2 mb-5">
                      {ev.date && (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <FaCalendarAlt className="text-blue-600 text-xs" />
                          <span className="font-medium">
                            {new Date(ev.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      )}
                      {ev.location && (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <FaMapMarkerAlt className="text-blue-600 text-xs" />
                          <span className="font-medium line-clamp-1">{ev.location}</span>
                        </div>
                      )}
                    </div>

                    {/* CTA */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenEvent(ev.id)
                      }}
                      className="inline-flex items-center gap-2 text-blue-900 font-semibold text-sm group-hover:gap-3 transition-all"
                    >
                      View Details
                      <FaArrowRight className="text-xs" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <div className="mb-6">
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">Authentication Required</h3>
              <p className="text-gray-600">Please sign in to view event details and book tickets</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowAuthModal(false)
                  navigate('/login')
                }}
                className="w-full py-3 bg-blue-900 text-white font-semibold rounded-xl hover:bg-blue-800 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setShowAuthModal(false)
                  navigate('/register')
                }}
                className="w-full py-3 border-2 border-gray-300 text-gray-900 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Create Account
              </button>
              <button
                onClick={() => setShowAuthModal(false)}
                className="w-full py-3 text-gray-600 hover:bg-gray-100 font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

