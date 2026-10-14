import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaLinkedin, FaTwitter, FaGithub, FaEnvelope } from 'react-icons/fa'

export default function About() {
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [visibleElements, setVisibleElements] = useState({})

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const animateKey = entry.target.getAttribute('data-animate')
          setVisibleElements(prev => ({
            ...prev,
            [animateKey]: true
          }))
        }
      })
    }, { threshold: 0.1 })

    document.querySelectorAll('[data-animate]').forEach(el => {
      observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Form submitted:', formData)
  }

  return (
    <div className="min-h-screen bg-white">
      <style>
        {`
        @keyframes slideInFromLeft {
          from {
            opacity: 0;
            transform: translateX(-100px) translateY(50px);
          }
          to {
            opacity: 1;
            transform: translateX(0) translateY(0);
          }
        }
        
        @keyframes slideInFromRight {
          from {
            opacity: 0;
            transform: translateX(100px) translateY(50px);
          }
          to {
            opacity: 1;
            transform: translateX(0) translateY(0);
          }
        }
        
        @keyframes slideInFromBottom {
          from {
            opacity: 0;
            transform: translateY(100px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes scaleUpFade {
          from {
            opacity: 0;
            transform: scale(0.8) translateY(40px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        @keyframes curveInUp {
          0% {
            opacity: 0;
            transform: translateY(80px) translateX(-30px);
          }
          50% {
            opacity: 0.6;
            transform: translateY(40px) translateX(15px);
          }
          100% {
            opacity: 1;
            transform: translateY(0) translateX(0);
          }
        }
        
        .animate-slide-left {
          animation: slideInFromLeft 0.8s ease-out forwards;
        }
        
        .animate-slide-right {
          animation: slideInFromRight 0.8s ease-out forwards;
        }
        
        .animate-slide-up {
          animation: slideInFromBottom 0.8s ease-out forwards;
        }
        
        .animate-scale-up {
          animation: scaleUpFade 0.8s ease-out forwards;
        }
        
        .animate-curve-in {
          animation: curveInUp 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        @keyframes revealUp {
          0% {
            opacity: 0;
            transform: translateY(24px);
            clip-path: inset(0 0 100% 0);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
            clip-path: inset(0 0 0 0);
          }
        }

        .animate-reveal {
          opacity: 0;
          animation: revealUp 0.85s ease-out forwards;
        }

        .reveal-delay-1 { animation-delay: 0.1s; }
        .reveal-delay-2 { animation-delay: 0.2s; }
        .reveal-delay-3 { animation-delay: 0.3s; }
        .reveal-delay-4 { animation-delay: 0.4s; }
        .reveal-delay-5 { animation-delay: 0.5s; }
        
        .stagger-1 { animation-delay: 0.1s; }
        .stagger-2 { animation-delay: 0.2s; }
        .stagger-3 { animation-delay: 0.3s; }
        .stagger-4 { animation-delay: 0.4s; }
        `}
      </style>

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
      `}</style>

      {/* Navigation Header */}
      <nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-900 rounded-md flex items-center justify-center">
                  <span className="text-white font-bold text-lg">K</span>
                </div>
                <span className="text-xl font-bold text-gray-900">ConfNow</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <button onClick={() => navigate('/')} className="nav-link text-gray-700 hover:text-gray-900 font-medium">Home</button>
              
              <button onClick={() => navigate('/events')} className="nav-link text-gray-700 hover:text-gray-900 font-medium">Events</button>

              <div className="relative group">
                <button onClick={() => navigate('/about')} className="nav-link text-gray-700 hover:text-gray-900 font-medium">
                  About
                </button>
              </div>

              <div className="relative group">
                <button onClick={() => navigate('/how-it-works')} className="nav-link text-gray-700 hover:text-gray-900 font-medium">
                  How It Works
                </button>
              </div>

              <div className="relative group">
                <button onClick={() => navigate('/contact')} className="nav-link text-gray-700 hover:text-gray-900 font-medium">
                  Contact
                </button>
              </div>
            </div>

            {/* Right Side Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={() => navigate('/register')}
                className="px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 font-medium"
              >
                Sign Up
              </button>
              <button 
                onClick={() => navigate('/login')}
                className="px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 font-medium"
              >
                Log in
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-700 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-3 space-y-3">
              <button onClick={() => navigate('/')} className="block text-gray-700 hover:text-gray-900 font-medium text-left">Home</button>
              <button onClick={() => navigate('/events')} className="block text-gray-700 hover:text-gray-900 font-medium text-left">Events</button>
              <a href="#solutions" className="block text-gray-700 hover:text-gray-900 font-medium">Solutions</a>
              <a href="#features" className="block text-gray-700 hover:text-gray-900 font-medium">Features</a>
              <button onClick={() => navigate('/about')} className="block text-gray-700 hover:text-gray-900 font-medium text-left">About</button>
              <button onClick={() => navigate('/how-it-works')} className="block text-gray-700 hover:text-gray-900 font-medium text-left">How It Works</button>
              <button onClick={() => navigate('/contact')} className="block text-gray-700 hover:text-gray-900 font-medium text-left">Contact</button>
              <button
                onClick={() => navigate('/register')}
                className="w-full px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 font-medium"
              >
                Sign Up
              </button>
              <button 
                onClick={() => navigate('/login')}
                className="w-full px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 font-medium text-left"
              >
                Log in
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <div className="inline-block px-3 py-1 bg-blue-50 rounded-full text-xs font-medium text-blue-900 mb-6 animate-reveal reveal-delay-1">
                Our Story
              </div>
              <h1 className="text-6xl lg:text-7xl font-light text-gray-900 mb-6 leading-tight animate-reveal reveal-delay-2">
                We craft
                <span className="block font-semibold">unforgettable</span>
                <span className="block text-gray-400 font-light">experiences</span>
              </h1>
              <p className="text-lg text-blue-700 max-w-xl mb-8 leading-relaxed animate-reveal reveal-delay-3">
                ConfNow reimagines the way communities connect through events. We blend technology with human touch to create moments that matter.
              </p>
              <div className="flex flex-wrap gap-4">
                <button className="px-8 py-3 bg-blue-900 text-white rounded-md hover:bg-blue-800 transition-all duration-300 transform hover:scale-105 hover:shadow-lg animate-reveal reveal-delay-4">
                  Explore Our Work
                </button>
                <button onClick={() => navigate('/contact')} className="px-8 py-3 border-2 border-blue-900 text-blue-900 rounded-md hover:bg-blue-50 transition-all duration-300 transform hover:scale-105 hover:shadow-lg animate-reveal reveal-delay-5">
                  Get in Touch
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 relative">
              <div className="relative h-[500px]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-900 rounded-3xl transform rotate-6 transition-transform duration-500 hover:scale-110 overflow-hidden">
                  <img src="/event 8.webp" alt="Event" className="w-full h-full object-cover" />
                </div>
                <div className="absolute bottom-0 left-0 w-72 h-72 bg-gray-200 rounded-3xl transform -rotate-3 transition-transform duration-500 hover:scale-105 overflow-hidden">
                  <img src="/event1.jpg" alt="Event" className="w-full h-full object-cover" />
                </div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-56 h-80 bg-blue-100 rounded-3xl transition-all duration-500 hover:shadow-2xl overflow-hidden">
                  <img src="/event3.jpeg" alt="Event" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white border-t-2 border-blue-100">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-5xl font-light text-gray-900 mb-6 leading-tight">
                Our philosophy is <span className="font-semibold text-blue-900">simple</span>
              </h2>
              <div className="w-16 h-1 bg-blue-900 mb-8"></div>
              <p className="text-blue-700 text-lg leading-relaxed mb-6">
                We believe every event should feel effortless. Behind the scenes, we obsess over details so you don't have to.
              </p>
              <p className="text-blue-700 leading-relaxed">
                From intimate gatherings to large-scale conferences, our approach remains consistent: thoughtful planning, seamless execution, and memorable experiences.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-6">
                <div data-animate="stat1" className={`bg-blue-50 p-8 rounded-2xl border border-blue-200 transition-all duration-300 hover:shadow-lg hover:border-blue-400 transform hover:scale-105 ${visibleElements['stat1'] ? 'animate-slide-left stagger-1' : 'opacity-0'}`}>
                  <div className="text-4xl font-light text-blue-900 mb-2">500+</div>
                  <div className="text-blue-700 text-sm">Events Delivered</div>
                </div>
                <div data-animate="stat2" className={`bg-blue-50 p-8 rounded-2xl border border-blue-200 transition-all duration-300 hover:shadow-lg hover:border-blue-400 transform hover:scale-105 ${visibleElements['stat2'] ? 'animate-slide-left stagger-2' : 'opacity-0'}`}>
                  <div className="text-4xl font-light text-blue-900 mb-2">98%</div>
                  <div className="text-blue-700 text-sm">Client Satisfaction</div>
                </div>
              </div>
              <div className="space-y-6 mt-12">
                <div data-animate="stat3" className={`bg-blue-50 p-8 rounded-2xl border border-blue-200 transition-all duration-300 hover:shadow-lg hover:border-blue-400 transform hover:scale-105 ${visibleElements['stat3'] ? 'animate-slide-right stagger-2' : 'opacity-0'}`}>
                  <div className="text-4xl font-light text-blue-900 mb-2">50K+</div>
                  <div className="text-blue-700 text-sm">Attendees</div>
                </div>
                <div data-animate="stat4" className={`bg-blue-50 p-8 rounded-2xl border border-blue-200 transition-all duration-300 hover:shadow-lg hover:border-blue-400 transform hover:scale-105 ${visibleElements['stat4'] ? 'animate-slide-right stagger-3' : 'opacity-0'}`}>
                  <div className="text-4xl font-light text-blue-900 mb-2">12+</div>
                  <div className="text-blue-700 text-sm">Years Experience</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mb-16">
            <div className="inline-block px-3 py-1 bg-blue-50 rounded-full text-xs font-medium text-blue-900 mb-4">
              Leadership
            </div>
            <h2 className="text-5xl font-light text-gray-900 mb-4">
              Meet the minds behind <span className="font-semibold text-blue-900">ConfNow</span>
            </h2>
            <p className="text-blue-700 text-lg">
              A diverse team of strategists, designers, and technologists united by a passion for creating exceptional events.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Team Member 1 */}
            <div className="group cursor-pointer transform transition-all duration-300 hover:-translate-y-2">
              <div className="relative h-96 mb-6 overflow-hidden rounded-2xl bg-gray-200 shadow-md transition-all duration-300 group-hover:shadow-2xl">
                <img src="/boyp.jpg" alt="Rahul Mehra" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-1 transition-colors duration-300 group-hover:text-blue-900">Rahul Mehra</h3>
              <p className="text-blue-700 text-sm mb-4">Founder & CEO</p>
              <div className="flex space-x-3 text-gray-600">
                <FaLinkedin className="w-4 h-4 hover:text-blue-900 cursor-pointer transition-all duration-300 transform hover:scale-125" />
                <FaTwitter className="w-4 h-4 hover:text-blue-900 cursor-pointer transition-all duration-300 transform hover:scale-125" />
                <FaEnvelope className="w-4 h-4 hover:text-blue-900 cursor-pointer transition-all duration-300 transform hover:scale-125" />
              </div>
            </div>

            {/* Team Member 2 */}
            <div className="group cursor-pointer transform transition-all duration-300 hover:-translate-y-2">
              <div className="relative h-96 mb-6 overflow-hidden rounded-2xl bg-gray-200 shadow-md transition-all duration-300 group-hover:shadow-2xl">
                <img src="/girlp.jpg" alt="Anjali Desai" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-1 transition-colors duration-300 group-hover:text-blue-900">Anjali Desai</h3>
              <p className="text-blue-700 text-sm mb-4">Head of Operations</p>
              <div className="flex space-x-3 text-gray-600">
                <FaLinkedin className="w-4 h-4 hover:text-blue-900 cursor-pointer transition-all duration-300 transform hover:scale-125" />
                <FaTwitter className="w-4 h-4 hover:text-blue-900 cursor-pointer transition-all duration-300 transform hover:scale-125" />
                <FaEnvelope className="w-4 h-4 hover:text-blue-900 cursor-pointer transition-all duration-300 transform hover:scale-125" />
              </div>
            </div>

            {/* Team Member 3 */}
            <div className="group cursor-pointer transform transition-all duration-300 hover:-translate-y-2">
              <div className="relative h-96 mb-6 overflow-hidden rounded-2xl bg-gray-200 shadow-md transition-all duration-300 group-hover:shadow-2xl">
                <img src="/boyp2.jpg" alt="Vikram Joshi" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-1 transition-colors duration-300 group-hover:text-blue-900">Vikram Joshi</h3>
              <p className="text-blue-700 text-sm mb-4">Lead Engineer</p>
              <div className="flex space-x-3 text-gray-600">
                <FaLinkedin className="w-4 h-4 hover:text-blue-900 cursor-pointer transition-all duration-300 transform hover:scale-125" />
                <FaTwitter className="w-4 h-4 hover:text-blue-900 cursor-pointer transition-all duration-300 transform hover:scale-125" />
                <FaEnvelope className="w-4 h-4 hover:text-blue-900 cursor-pointer transition-all duration-300 transform hover:scale-125" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div className="space-y-12">
              <div data-animate="value1" className={`${visibleElements['value1'] ? 'animate-slide-left stagger-1' : 'opacity-0'}`}>
                <div className="text-sm font-semibold text-blue-900 mb-3">01 — Innovation</div>
                <h3 className="text-2xl font-light text-gray-900 mb-3">Always evolving</h3>
                <p className="text-blue-700 leading-relaxed">
                  We continuously explore new technologies and methodologies to keep our event solutions at the cutting edge.
                </p>
              </div>

              <div data-animate="value2" className={`${visibleElements['value2'] ? 'animate-slide-left stagger-2' : 'opacity-0'}`}>
                <div className="text-sm font-semibold text-blue-900 mb-3">02 — Quality</div>
                <h3 className="text-2xl font-light text-gray-900 mb-3">Excellence in execution</h3>
                <p className="text-blue-700 leading-relaxed">
                  Every detail matters. From registration to post-event analytics, we maintain the highest standards.
                </p>
              </div>

              <div data-animate="value3" className={`${visibleElements['value3'] ? 'animate-slide-left stagger-3' : 'opacity-0'}`}>
                <div className="text-sm font-semibold text-blue-900 mb-3">03 — Partnership</div>
                <h3 className="text-2xl font-light text-gray-900 mb-3">Your success is ours</h3>
                <p className="text-blue-700 leading-relaxed">
                  We work alongside you as collaborators, invested in making your event vision a reality.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="sticky top-32">
                <div data-animate="valueCard" className={`aspect-square bg-white rounded-3xl overflow-hidden border-2 border-blue-100 shadow-sm ${visibleElements['valueCard'] ? 'animate-scale-up' : 'opacity-0'}`}>
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center p-12">
                      <div className="text-7xl font-light text-blue-900 mb-4">250+</div>
                      <div className="text-gray-600">Organizations trust us</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-blue-900 text-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-16">
            <div className="lg:col-span-2">
              <div className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-medium mb-6">
                Get Started
              </div>
              <h2 className="text-4xl font-bold mb-6 leading-tight">
                Let's create something <span className="text-blue-100">remarkable</span>
              </h2>
              <p className="text-blue-200 mb-8 leading-relaxed">
                Have an event in mind? We'd love to hear about it. Reach out and let's discuss how we can bring your vision to life.
              </p>
              <div className="space-y-4 text-blue-200 text-sm">
                <div className="flex items-center space-x-3">
                  <FaEnvelope className="w-4 h-4" />
                  <span>hello@confnow.com</span>
                </div>
                <div className="flex items-center space-x-3">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>+91 98765 43210</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Your name"
                    className="w-full px-0 py-3 bg-transparent border-b border-white/30 text-white placeholder-blue-300 focus:border-white focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Email address"
                    className="w-full px-0 py-3 bg-transparent border-b border-white/30 text-white placeholder-blue-300 focus:border-white focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    placeholder="Subject"
                    className="w-full px-0 py-3 bg-transparent border-b border-white/30 text-white placeholder-blue-300 focus:border-white focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="Tell us about your event"
                    rows="4"
                    className="w-full px-0 py-3 bg-transparent border-b border-white/30 text-white placeholder-blue-300 focus:border-white focus:outline-none transition-colors resize-none"
                  ></textarea>
                </div>

                <div>
                  <button
                    type="submit"
                    className="w-full py-4 bg-blue-900 text-white rounded-md font-semibold hover:bg-blue-800 transition-all duration-300 transform hover:scale-105 hover:shadow-lg active:scale-95"
                  >
                    Send Message
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div className="inline-block px-3 py-1 bg-blue-50 rounded-full text-xs font-medium text-blue-900 mb-4">
              Testimonials
            </div>
            <h2 className="text-4xl font-light text-gray-900 mb-4">
              Trusted by <span className="font-semibold text-blue-900">industry leaders</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <p className="text-blue-700 mb-6 leading-relaxed">
                "The attention to detail and seamless execution made our annual summit truly memorable."
              </p>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-300 rounded-full transition-transform duration-300 group-hover:scale-110"></div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">Priya Sharma</div>
                  <div className="text-gray-500 text-xs">CEO, TechCorp</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <p className="text-blue-700 mb-6 leading-relaxed">
                "ConfNow transformed how we think about virtual and hybrid events. Outstanding platform."
              </p>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-300 rounded-full transition-transform duration-300 group-hover:scale-110"></div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">Arjun Patel</div>
                  <div className="text-gray-500 text-xs">Director, Innovation Labs</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <p className="text-blue-700 mb-6 leading-relaxed">
                "Professional, responsive, and incredibly easy to work with. Highly recommend for any event."
              </p>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-300 rounded-full transition-transform duration-300 group-hover:scale-110"></div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">Neha Gupta</div>
                  <div className="text-gray-500 text-xs">Marketing Lead, StartupHub</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-blue-900 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
                  <span className="text-blue-900 font-bold text-lg">K</span>
                </div>
                <span className="text-xl font-bold">ConfNow</span>
              </div>
              <p className="text-blue-200 text-sm max-w-sm">
                Creating memorable events and meaningful connections across the globe.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-4">Navigation</h3>
              <ul className="space-y-2 text-blue-200 text-sm">
                <li><button onClick={() => navigate('/')} className="hover:text-white transition-colors">Home</button></li>
                <li><button onClick={() => navigate('/events')} className="hover:text-white transition-colors">Events</button></li>
                <li><button onClick={() => navigate('/about')} className="hover:text-white transition-colors">About</button></li>
                <li><button onClick={() => navigate('/contact')} className="hover:text-white transition-colors">Contact</button></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-blue-200 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/20 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-blue-200 text-sm">&copy; 2026 ConfNow. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <FaLinkedin className="w-5 h-5 text-blue-200 hover:text-white cursor-pointer transition-colors" />
              <FaTwitter className="w-5 h-5 text-blue-200 hover:text-white cursor-pointer transition-colors" />
              <FaGithub className="w-5 h-5 text-blue-200 hover:text-white cursor-pointer transition-colors" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
