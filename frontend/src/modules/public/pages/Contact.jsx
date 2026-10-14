import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ContactPage() {
	const navigate = useNavigate()
	const [isSubmitted, setIsSubmitted] = useState(false)

	const handleSubmit = (e) => {
		e.preventDefault()
		setIsSubmitted(true)
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative overflow-hidden">
			<style>{`
				@keyframes typing {
					from {
						width: 0;
					}
					to {
						width: 100%;
					}
				}
				
				@keyframes blink {
					0%, 50% {
						border-right-color: rgba(255, 255, 255, 0.8);
					}
					51%, 100% {
						border-right-color: transparent;
					}
				}
				
				.typing-text {
					display: inline-block;
					overflow: hidden;
					border-right: 3px solid rgba(255, 255, 255, 0.8);
					animation: typing 2.5s steps(40, end), blink 0.75s step-end infinite;
					white-space: nowrap;
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
			{/* Creative Background Elements */}
			<div className="absolute top-0 left-0 w-full h-full pointer-events-none">
				<div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl animate-pulse"></div>
				<div className="absolute bottom-32 right-20 w-96 h-96 bg-gradient-to-br from-purple-400/15 to-pink-400/15 rounded-full blur-3xl"></div>
				<div className="absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-to-br from-cyan-400/10 to-blue-400/10 rounded-full blur-2xl"></div>
				
				{/* Decorative Grid Pattern */}
				<div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30"></div>
				
				{/* Floating Shapes */}
				<div className="absolute top-40 right-32 w-4 h-4 bg-blue-400 rounded-full opacity-40 animate-bounce"></div>
				<div className="absolute bottom-64 left-48 w-3 h-3 bg-indigo-500 rounded-full opacity-30"></div>
				<div className="absolute top-2/3 right-1/3 w-2 h-2 bg-purple-400 rounded-full opacity-50"></div>
			</div>

			<header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative">
					<button
						onClick={() => navigate('/')}
						className="flex items-center gap-2"
					>
						<div className="w-8 h-8 bg-blue-900 rounded-md flex items-center justify-center">
							<span className="text-white font-bold text-lg">K</span>
						</div>
						<span className="text-xl font-bold text-gray-900">ConfNow</span>
					</button>

					<nav className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-8">
						<button
							onClick={() => navigate('/')}
							className="nav-link text-gray-700 hover:text-gray-900 text-lg font-medium"
						>
							Home
						</button>
						<button
							onClick={() => navigate('/events')}
							className="nav-link text-gray-700 hover:text-gray-900 text-lg font-medium"
						>
							Events
						</button>
						<button
							onClick={() => navigate('/about')}
							className="nav-link text-gray-700 hover:text-gray-900 text-lg font-medium"
						>
							About
						</button>
						<button
							onClick={() => navigate('/how-it-works')}
							className="nav-link text-gray-700 hover:text-gray-900 text-lg font-medium"
						>
							How It Works
						</button>
						<button
							onClick={() => navigate('/contact')}
							className="nav-link text-blue-900 text-lg font-semibold"
						>
							Contact
						</button>
					</nav>

					<button
						onClick={() => navigate('/register')}
						className="px-5 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 text-lg font-semibold"
					>
						Get Started
					</button>
				</div>
			</header>

			<section className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 z-10">
				<div className="text-center mb-16">
					<p className="text-blue-600 text-sm font-semibold uppercase tracking-widest mb-3">Contact Us</p>
					<h1 className="text-5xl sm:text-6xl font-light text-gray-900 mb-4 leading-tight">
						Build a Better<br />
						<span className="font-semibold text-blue-900">Event Experience</span>
					</h1>
					<p className="text-gray-600 text-lg max-w-2xl mx-auto">
						Tell us your event goals and we'll suggest the right ticketing, attendee flow, and operations setup.
					</p>
				</div>

				<div className="relative grid grid-cols-1 lg:grid-cols-5 gap-8">
					<div className="lg:col-span-2 space-y-5">
						<div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
							<h2 className="text-xl font-bold text-gray-900 mb-4">Talk to Our Event Team</h2>
							<div className="space-y-4 text-sm">
								<div className="flex items-start justify-between gap-4">
									<div>
										<p className="text-gray-500">Phone</p>
										<p className="font-semibold text-gray-900">+91 98765 43210</p>
									</div>
									<span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">Available Now</span>
								</div>
								<div>
									<p className="text-gray-500">Email</p>
									<p className="font-semibold text-gray-900">support@confnow.com</p>
								</div>
								<div>
									<p className="text-gray-500">Office</p>
									<p className="font-semibold text-gray-900">New Delhi, India</p>
								</div>
							</div>
						</div>

						<div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
							<h3 className="text-lg font-bold text-gray-900 mb-4">What happens next?</h3>
							<div className="space-y-4 text-sm text-gray-700">
								<div className="flex gap-3">
									<span className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center">1</span>
									<p>We review your event requirements and use case.</p>
								</div>
								<div className="flex gap-3">
									<span className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center">2</span>
									<p>Our specialist contacts you with a custom plan.</p>
								</div>
								<div className="flex gap-3">
									<span className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center">3</span>
									<p>You get onboarding help to launch smoothly.</p>
								</div>
							</div>
						</div>

						<div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
							<p className="text-sm text-blue-800 font-medium">Average first response</p>
							<p className="text-2xl font-extrabold text-blue-900 mt-1">Within 2 hours</p>
							<p className="text-sm text-blue-700 mt-2">Mon - Sat, 9:00 AM - 7:00 PM</p>
						</div>
					</div>

					<div className="lg:col-span-3 bg-white/95 backdrop-blur border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xl">
						{isSubmitted && (
							<div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-800 text-sm font-medium">
								Thanks! Your message has been received. Our event expert will contact you shortly.
							</div>
						)}

						<form className="space-y-5" onSubmit={handleSubmit}>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-2">Your Name</label>
									<input required className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-200" placeholder="Enter your full name" />
								</div>
								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-2">Work Email</label>
									<input required type="email" className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-200" placeholder="you@company.com" />
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-2">Contact Reason</label>
									<select className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-200 bg-white">
										<option>Platform support</option>
										<option>Enterprise plan</option>
										<option>Partnership</option>
										<option>Other</option>
									</select>
								</div>
								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
									<input className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-200" placeholder="+91 98XXXXXXXX" />
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-2">Event Type</label>
									<select className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-200 bg-white">
										<option>Conference</option>
										<option>Festival</option>
										<option>Webinar</option>
										<option>Community Meetup</option>
										<option>Workshop</option>
										<option>Other</option>
									</select>
								</div>
								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-2">Expected Attendees</label>
									<input className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-200" placeholder="e.g. 500" />
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-2">Event Date (Optional)</label>
									<input type="date" className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-200" />
								</div>
								<div>
									<label className="block text-sm font-semibold text-gray-700 mb-2">Preferred Contact Method</label>
									<select className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-200 bg-white">
										<option>Email</option>
										<option>Phone Call</option>
										<option>WhatsApp</option>
									</select>
								</div>
							</div>

							<div>
								<label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
								<textarea required rows={5} className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-200 resize-none" placeholder="Tell us what you need help with..." />
							</div>

							<div className="pt-1">
								<button type="submit" className="px-6 py-3 bg-blue-900 text-white rounded-xl hover:bg-blue-800 font-semibold">
									Send Message
								</button>
							</div>
						</form>
					</div>
				</div>

				{/* FAQ Section - Creative Design */}
				<div className="mt-16 relative">
					{/* Background Accent */}
					<div className="absolute -top-20 -left-40 w-80 h-80 bg-blue-50 rounded-full opacity-40 blur-3xl"></div>
					
					<div className="relative z-10">
						{/* Header - Asymmetric Creative Design */}
						<div className="mb-20">
							<div className="flex flex-col md:flex-row md:items-end md:justify-between md:gap-16">
								<div className="flex-1">
									<p className="text-sm font-medium text-gray-500 mb-6 tracking-wide">HELP CENTER</p>
									<h2 className="text-5xl md:text-6xl font-black text-gray-900 leading-tight">
										Questions?
										<br/>
									<span className="block mt-3">
										We've got <span className="relative inline-block">
											answers
											<svg className="absolute -bottom-2 left-0 w-full h-2" viewBox="0 0 200 20" preserveAspectRatio="none">
												<path d="M0 10 Q 50 0, 100 10 T 200 10" stroke="#3b82f6" strokeWidth="3" fill="none" vectorEffect="non-scaling-stroke"/>
											</svg>
										</span>
										</span>
									</h2>
									<p className="text-gray-600 text-lg mt-8 max-w-2xl leading-relaxed">
										Check out the answers below, or reach out directly if you need something more.
									</p>
								</div>
								<div className="mt-10 md:mt-0">
									<div className="space-y-3">
										<div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
											<div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
												<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
												</svg>
											</div>
											<div>
												<p className="text-xs text-gray-600 font-medium">Response Time</p>
												<p className="text-lg font-bold text-gray-900">2h max</p>
											</div>
										</div>
										<div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-xl">
											<div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
												<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
												</svg>
											</div>
											<div>
												<p className="text-xs text-gray-600 font-medium">Support Available</p>
												<p className="text-lg font-bold text-gray-900">24/7</p>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* FAQ Grid with creative arrangement */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
							{/* First Column */}
							<div className="space-y-8">
								{/* Question 1 - Full width style */}
								<div className="group cursor-pointer">
									<div className="bg-gradient-to-br from-blue-600/5 to-indigo-600/5 border-l-4 border-blue-600 pl-6 pr-6 py-5 hover:from-blue-600/10 hover:to-indigo-600/10 transition-all duration-300 rounded-r-lg">
										<div className="flex items-start justify-between gap-4">
											<div className="flex-1">
												<h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition">How fast do you respond?</h3>
												<p className="text-gray-600 text-sm leading-relaxed">
													We're fast. 2 hours max during business hours (Mon-Sat, 9 AM - 7 PM IST). Urgent stuff? Call us directly and we'll handle it on the spot.
												</p>
											</div>
											<svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
											</svg>
										</div>
									</div>
								</div>

								{/* Question 2 */}
								<div className="group cursor-pointer">
									<div className="bg-gradient-to-br from-purple-600/5 to-pink-600/5 border-l-4 border-purple-600 pl-6 pr-6 py-5 hover:from-purple-600/10 hover:to-pink-600/10 transition-all duration-300 rounded-r-lg">
										<div className="flex items-start justify-between gap-4">
											<div className="flex-1">
												<h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition">Enterprise plans available?</h3>
												<p className="text-gray-600 text-sm leading-relaxed">
													100%. Custom solutions, dedicated account manager, custom APIs, advanced analytics, priority support. Tell us "Enterprise" and we'll build something perfect for you.
												</p>
											</div>
											<svg className="w-5 h-5 text-purple-600 flex-shrink-0 mt-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
											</svg>
										</div>
									</div>
								</div>

								{/* Question 3 */}
								<div className="group cursor-pointer">
									<div className="bg-gradient-to-br from-amber-600/5 to-orange-600/5 border-l-4 border-amber-600 pl-6 pr-6 py-5 hover:from-amber-600/10 hover:to-orange-600/10 transition-all duration-300 rounded-r-lg">
										<div className="flex items-start justify-between gap-4">
											<div className="flex-1">
												<h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-amber-600 transition">Schedule a demo?</h3>
												<p className="text-gray-600 text-sm leading-relaxed">
													Yes, absolutely. Drop your preferred date and time in the form above. We'll set up a one-on-one walkthrough tailored to what you need.
												</p>
											</div>
											<svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
											</svg>
										</div>
									</div>
								</div>
							</div>

							{/* Second Column */}
							<div className="space-y-8">
								{/* Question 4 */}
								<div className="group cursor-pointer">
									<div className="bg-gradient-to-br from-green-600/5 to-emerald-600/5 border-l-4 border-green-600 pl-6 pr-6 py-5 hover:from-green-600/10 hover:to-emerald-600/10 transition-all duration-300 rounded-r-lg">
										<div className="flex items-start justify-between gap-4">
											<div className="flex-1">
												<h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-green-600 transition">How do I reach you?</h3>
												<p className="text-gray-600 text-sm leading-relaxed">
													Multiple ways. Email (support@confnow.com), phone (+91 98765 43210), or WhatsApp. Choose whatever works best for you.
												</p>
											</div>
											<svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
											</svg>
										</div>
									</div>
								</div>

								{/* Question 5 */}
								<div className="group cursor-pointer">
									<div className="bg-gradient-to-br from-red-600/5 to-pink-600/5 border-l-4 border-red-600 pl-6 pr-6 py-5 hover:from-red-600/10 hover:to-pink-600/10 transition-all duration-300 rounded-r-lg">
										<div className="flex items-start justify-between gap-4">
											<div className="flex-1">
												<h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-red-600 transition">Do consultations cost?</h3>
												<p className="text-gray-600 text-sm leading-relaxed">
													No charge whatsoever. Consultations and demos are free. We only talk pricing after we understand exactly what you need.
												</p>
											</div>
											<svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
											</svg>
										</div>
									</div>
								</div>

								{/* Question 6 */}
								<div className="group cursor-pointer">
									<div className="bg-gradient-to-br from-cyan-600/5 to-blue-600/5 border-l-4 border-cyan-600 pl-6 pr-6 py-5 hover:from-cyan-600/10 hover:to-blue-600/10 transition-all duration-300 rounded-r-lg">
										<div className="flex items-start justify-between gap-4">
											<div className="flex-1">
												<h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-cyan-600 transition">Visiting your office?</h3>
												<p className="text-gray-600 text-sm leading-relaxed">
													We'd love to meet you. Our New Delhi office is open Mon-Sat. Just book an appointment through the form so we're ready for you.
												</p>
											</div>
											<svg className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
											</svg>
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* CTA Section - Redesigned */}
						<div className="mt-24 pt-16 border-t border-gray-200">
							<div className="text-center mb-12">
								<h3 className="text-4xl font-bold text-gray-900 mb-4">Still have questions?</h3>
								<p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
									We're genuinely excited to help you build amazing events. Reach out via email, phone, or WhatsApp—pick whatever's easiest for you.
								</p>
							</div>
							
							<div className="flex flex-col sm:flex-row items-center justify-center gap-6">
								<a href="mailto:support@confnow.com" className="group relative px-8 py-4 bg-blue-600 text-white rounded-2xl font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center gap-3">
									<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
									</svg>
									Send Email
								</a>
								<a href="tel:+919876543210" className="group relative px-8 py-4 border-2 border-gray-300 text-gray-900 rounded-2xl font-semibold hover:border-blue-600 hover:text-blue-600 transition-all flex items-center gap-3">
									<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
									</svg>
									Give us a Call
								</a>
								<a href="https://wa.me/919876543210" className="group relative px-8 py-4 border-2 border-gray-300 text-gray-900 rounded-2xl font-semibold hover:border-green-500 hover:text-green-600 transition-all flex items-center gap-3">
									<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
										<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-9.746 9.798c0 2.734.732 5.377 2.124 7.661L2.98 21.94l8.305-2.176c2.22 1.201 4.718 1.856 7.315 1.856 5.205 0 9.45-4.223 9.476-9.425 0-2.528-.675-4.9-1.956-6.957-1.281-2.057-3.055-3.861-5.164-5.160-2.11-1.299-4.547-2.01-7.157-2.01"/>
									</svg>
									WhatsApp
								</a>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="bg-gray-900 text-white py-12 mt-16">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid grid-cols-1 md:grid-cols-4 gap-8">
						<div>
							<div className="flex items-center space-x-2 mb-4">
								<div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
									<span className="text-white font-bold text-lg">K</span>
								</div>
								<span className="text-xl font-bold">ConfNow</span>
							</div>
							<p className="text-gray-400">
								The all-in-one platform for event management
							</p>
						</div>
						<div>
							<h3 className="font-semibold mb-4">Product</h3>
							<ul className="space-y-2 text-gray-400">
								<li><a href="#" className="hover:text-white">Features</a></li>
								<li><a href="#" className="hover:text-white">Contact</a></li>
								<li><a href="#" className="hover:text-white">Solutions</a></li>
							</ul>
						</div>
						<div>
							<h3 className="font-semibold mb-4">Company</h3>
							<ul className="space-y-2 text-gray-400">
								<li><a href="#" className="hover:text-white">About</a></li>
								<li><a href="#" className="hover:text-white">Blog</a></li>
								<li><a href="#" className="hover:text-white">Careers</a></li>
							</ul>
						</div>
						<div>
							<h3 className="font-semibold mb-4">Support</h3>
							<ul className="space-y-2 text-gray-400">
								<li><a href="#" className="hover:text-white">Help Center</a></li>
								<li><a href="#" className="hover:text-white">Contact Us</a></li>
								<li><a href="#" className="hover:text-white">Privacy Policy</a></li>
							</ul>
						</div>
					</div>
					<div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
						<p>&copy; 2026 ConfNow. All rights reserved.</p>
					</div>
				</div>
			</footer>
		</div>
	)
}
