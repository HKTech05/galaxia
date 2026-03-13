"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ReviewCarousel from "./components/ReviewCarousel";

export default function HomePage() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
	  setIsLoggedIn(!!localStorage.getItem("galaxia_token"));
  }, []);

  return (
	<div className="min-h-screen bg-cream-white flex flex-col">
	  {/* Navbar */}
	  <nav className="fixed top-0 left-0 right-0 z-50 glass-light">
		<div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
		  <Link href="/" className="flex items-center gap-3">
			<div className="w-10 h-10 rounded-full bg-gradient-to-br from-antique-gold to-dark-gold flex items-center justify-center">
			  <span className="text-white font-cinzel font-bold text-lg">G</span>
			</div>
			<span className="font-cinzel text-xl sm:text-2xl font-semibold text-gold-gradient">
			  GALAXIA
			</span>
		  </Link>
		  <div className="flex items-center gap-3">
			<Link href="/" className="w-10 h-10 rounded-full border border-border-medium flex items-center justify-center hover:border-antique-gold hover:bg-antique-gold/5 transition-all duration-300 group">
			  <svg className="w-5 h-5 text-text-secondary group-hover:text-antique-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
			  </svg>
			</Link>
			<button 
			  onClick={() => isLoggedIn ? router.push("/dashboard?source=all") : setShowAuthModal(true)} 
			  className="w-10 h-10 rounded-full border border-border-medium flex items-center justify-center hover:border-antique-gold hover:bg-antique-gold/5 transition-all duration-300 group"
			>
			  <svg className="w-5 h-5 text-text-secondary group-hover:text-antique-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
			  </svg>
			</button>
		  </div>
		</div>
	  </nav>

	  {/* ChatGPT-style Dark Auth Modal */}
	  {showAuthModal && (
		  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
			  <div className="bg-[#202123] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-[400px] overflow-hidden flex flex-col items-center p-8 xs:p-10 relative transform transition-all">
				  <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
					  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
				  </button>
				  
				  <h2 className="font-inter text-[28px] font-semibold text-white mb-2 text-center tracking-tight">Log in or sign up</h2>
				  <p className="font-inter text-[15px] text-[#C5C5D2] text-center mb-8 px-2 font-normal">
					  Sign in to your account or create a new one to access your premium reservations.
				  </p>
				  
				  <div className="w-full space-y-3">
					  <button 
						  onClick={(e) => {
							  e.preventDefault();
							  if (typeof window !== "undefined") {
								  const redirectUri = `${window.location.origin}/auth/callback`;
								  const cognitoUrl = `https://ap-south-1diugx2q6b.auth.ap-south-1.amazoncognito.com/oauth2/authorize?client_id=2elbrrrn0rcabd58aapdet82ht&response_type=code&scope=email+openid&redirect_uri=${encodeURIComponent(redirectUri)}&identity_provider=Google`;
								  window.location.href = cognitoUrl;
							  }
						  }}
						  className="w-full bg-white text-black hover:bg-gray-100 flex items-center justify-center gap-3 py-[14px] px-4 rounded-md font-inter text-[15px] font-medium transition-colors border border-transparent hover:border-gray-200"
					  >
						  <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-[18px] h-[18px]" />
						  Continue with Google
					  </button>
					  
					  <div className="flex items-center gap-4 py-2 opacity-60">
						  <div className="h-[1px] bg-white/20 flex-1"></div>
						  <span className="text-white/80 font-inter text-xs uppercase tracking-wider">or</span>
						  <div className="h-[1px] bg-white/20 flex-1"></div>
					  </div>

					  <button 
						  onClick={(e) => {
							  e.preventDefault();
							  if (typeof window !== "undefined") {
								  const redirectUri = `${window.location.origin}/auth/callback`;
								  const cognitoUrl = `https://ap-south-1diugx2q6b.auth.ap-south-1.amazoncognito.com/login?client_id=2elbrrrn0rcabd58aapdet82ht&response_type=code&scope=email+openid&redirect_uri=${encodeURIComponent(redirectUri)}`;
								  window.location.href = cognitoUrl;
							  }
						  }}
						  className="w-full bg-[#343541] outline outline-1 outline-[#565869] text-white hover:bg-[#40414F] flex items-center justify-center gap-3 py-[14px] px-4 rounded-md font-inter text-[15px] font-medium transition-colors"
					  >
						  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
						  Continue with Email
					  </button>
				  </div>
			  </div>
		  </div>
	  )}

	  {/* Main Content */}
	  <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-24">
		<div className="text-center mb-10 sm:mb-16 animate-fade-in-up">
		  <p className="text-antique-gold font-inter text-xs tracking-[0.3em] uppercase mb-4">Welcome to</p>
		  <h1 className="font-cinzel text-5xl sm:text-6xl md:text-8xl font-bold text-gold-gradient mb-6">GALAXIA</h1>
		  <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-antique-gold to-transparent mx-auto mb-6" />
		  <p className="font-inter text-text-secondary text-base sm:text-lg md:text-xl max-w-xl mx-auto leading-relaxed">
			Choose your premium experience
		  </p>
		</div>

		{/* Two Cards */}
		<div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl w-full mb-16 sm:mb-20 stagger-children">
		  {/* Celebration Card */}
		  <Link href="/celebration" className="group relative block" onMouseEnter={() => setHoveredCard("celebration")} onMouseLeave={() => setHoveredCard(null)}>
			<div className="relative overflow-hidden rounded-2xl border border-border-light h-[400px] sm:h-[500px] md:h-[600px] transition-all duration-700 hover:border-antique-gold/50 hover:shadow-[0_8px_40px_rgba(186,151,49,0.12)]">
			  <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80')` }} />
			  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
			  <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 md:p-10">
				<p className="text-amber-300 text-xs tracking-[0.25em] uppercase mb-2 font-inter">Private Screenings</p>
				<h2 className="font-cinzel text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">CELEBRATION</h2>
				<p className="text-amber-200 font-inter text-sm sm:text-base mb-1">Digital Diaries</p>
				<p className="text-white/70 font-inter text-xs sm:text-sm leading-relaxed mb-6 max-w-sm">
				  Premium private movie screening experience with themed rooms. Celebrate birthdays, anniversaries, or enjoy a cinematic evening in style.
				</p>
				<div className="flex items-center gap-2 text-amber-300 font-inter text-sm font-medium group-hover:gap-4 transition-all duration-300">
				  <span>Explore Screens</span>
				  <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
				</div>
			  </div>
			  <div className="absolute top-6 right-6 w-12 h-12 border-t border-r border-white/20 rounded-tr-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
			</div>
		  </Link>

		  {/* Staycation Card */}
		  <Link href="/staycation" className="group relative block" onMouseEnter={() => setHoveredCard("staycation")} onMouseLeave={() => setHoveredCard(null)}>
			<div className="relative overflow-hidden rounded-2xl border border-border-light h-[400px] sm:h-[500px] md:h-[600px] transition-all duration-700 hover:border-antique-gold/50 hover:shadow-[0_8px_40px_rgba(186,151,49,0.12)]">
			  <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=800&q=80')` }} />
			  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
			  <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 md:p-10">
				<p className="text-amber-300 text-xs tracking-[0.25em] uppercase mb-2 font-inter">Luxury Villas & Resorts</p>
				<h2 className="font-cinzel text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">STAYCATION</h2>
				<p className="text-amber-200 font-inter text-sm sm:text-base mb-1">Exclusive Properties</p>
				<p className="text-white/70 font-inter text-xs sm:text-sm leading-relaxed mb-6 max-w-sm">
				  Discover private themed villas, pool cottages, and mountain apartments. Your perfect getaway in the heart of nature.
				</p>
				<div className="flex items-center gap-2 text-amber-300 font-inter text-sm font-medium group-hover:gap-4 transition-all duration-300">
				  <span>Explore Properties</span>
				  <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
				</div>
			  </div>
			  <div className="absolute top-6 right-6 w-12 h-12 border-t border-r border-white/20 rounded-tr-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
			</div>
		  </Link>
		</div>

		{/* Guest Reviews Section */}
		<section className="w-full max-w-7xl mx-auto px-4 sm:px-6 mb-20 animate-fade-in-up" style={{ animationDelay: "0.6s" }}>
		  <div className="text-center mb-12">
			<p className="text-antique-gold font-inter text-xs tracking-[0.3em] uppercase mb-3">Testimonials</p>
			<h2 className="font-cinzel text-2xl sm:text-3xl md:text-4xl font-semibold text-text-primary mb-4 text-center">Guest Experiences</h2>
			<div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-antique-gold to-transparent mx-auto" />
		  </div>
		  <ReviewCarousel />
		</section>

		<div className="text-center mb-12 animate-fade-in-up" style={{ animationDelay: "0.8s" }}>
		  <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-antique-gold/40 to-transparent mx-auto mb-4" />
		  <p className="text-text-muted font-inter text-xs tracking-[0.2em] uppercase">Premium Experiences — Curated for You</p>
		</div>
	  </main>
	</div>
  );
}
