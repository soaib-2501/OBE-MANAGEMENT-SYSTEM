import React from 'react';

export default function AuthFrame({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-800 flex flex-col justify-between relative overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* Subtle Background Lighting & Grid */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[650px] h-[350px] rounded-full bg-blue-500/[0.06] blur-[90px]" />
        <div className="absolute top-1/3 -right-20 w-[350px] h-[350px] rounded-full bg-indigo-500/[0.04] blur-[100px]" />
        <div className="absolute -bottom-20 -left-20 w-[350px] h-[350px] rounded-full bg-blue-600/[0.04] blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 30%, transparent 80%)',
          }}
        />
      </div>

      {/* Brand Header */}
      <header className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-7 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-md shadow-blue-600/20 text-white font-bold text-sm tracking-wider">
            OBE
          </div>
          <div>
            <h1 className="font-bold text-base text-slate-900 tracking-tight leading-tight">
              OBE Management System
            </h1>
            <p className="text-xs text-slate-500 font-medium">Outcome-Based Education Portal</p>
          </div>
        </div>

        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white border border-slate-200 text-slate-600 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          NBA &amp; NAAC Aligned
        </span>
      </header>

      {/* Centered Main Form Container */}
      <main className="relative z-10 w-full max-w-md mx-auto px-4 py-8 sm:py-12 flex-1 flex items-center justify-center">
        <div className="w-full">
          {children}
        </div>
      </main>

      {/* Clean Minimal Footer */}
      <footer className="relative z-10 w-full max-w-5xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 border-t border-slate-200/70">
        <p>&copy; {new Date().getFullYear()} OBE Management System. All rights reserved.</p>
        <p className="text-slate-500">Autonomous Faculty &amp; Administrator Access</p>
      </footer>
    </div>
  );
}
