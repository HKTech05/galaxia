"use client";

import Link from "next/link";
import { useState } from "react";

export default function HomePage() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

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
            <Link href="/dashboard?source=all" className="w-10 h-10 rounded-full border border-border-medium flex items-center justify-center hover:border-antique-gold hover:bg-antique-gold/5 transition-all duration-300 group">
              <svg className="w-5 h-5 text-text-secondary group-hover:text-antique-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </Link>
          </div>
        </div>
      </nav>

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

        <div className="text-center mb-12 animate-fade-in-up" style={{ animationDelay: "0.8s" }}>
          <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-antique-gold/40 to-transparent mx-auto mb-4" />
          <p className="text-text-muted font-inter text-xs tracking-[0.2em] uppercase">Premium Experiences — Curated for You</p>
        </div>
      </main>
    </div>
  );
}
