import React from 'react';

const HIGHLIGHTS = [
  {
    icon: (
      <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: 'Course Files & Bloom\'s Taxonomy',
    desc: 'Course descriptions, CO definitions, Bloom levels, and CO–PO–PSO mapping with justification.',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Automated Attainment Engine',
    desc: 'Direct (60% Tests + 20% Assignments) & Indirect (20% Exit Survey) attainment calculated automatically.',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
      </svg>
    ),
    title: 'Accreditation-Ready A4 Reports',
    desc: 'Generate printable Course Descriptions, Opening Reports, Assessment Tools, and Closing Reports.',
  },
];

export default function AuthFrame({ children }) {
  return (
    <div className="min-h-screen bg-[#070d18] text-slate-100 flex flex-col justify-between relative overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* Dynamic Ambient Background Glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 -left-32 w-[550px] h-[550px] rounded-full bg-blue-600/20 blur-[130px]" />
        <div className="absolute top-1/3 -right-24 w-[450px] h-[450px] rounded-full bg-indigo-600/20 blur-[140px]" />
        <div className="absolute -bottom-32 left-1/3 w-[500px] h-[500px] rounded-full bg-amber-500/10 blur-[140px]" />
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.25) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
            maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 40%, transparent 80%)',
          }}
        />
      </div>

      {/* Top Header / Brand Bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-6 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-400 p-[1.5px] shadow-lg shadow-blue-500/20">
            <div className="h-full w-full bg-[#0b1324] rounded-[14px] flex items-center justify-center">
              <span className="font-extrabold text-sm tracking-wider bg-gradient-to-r from-blue-400 via-indigo-200 to-amber-300 bg-clip-text text-transparent">
                OBE
              </span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white">OBE Management System</span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                v2.0
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Outcome-Based Education & NBA Accreditation Portal</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/60 backdrop-blur-md text-xs text-slate-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Academic Portal Active</span>
          </div>
        </div>
      </header>

      {/* Main Content: Split Hero & Login Grid */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 py-8 sm:px-8 lg:py-12 flex-1 flex items-center">
        <div className="w-full grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Hero & Feature Showcase (7 columns) */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-8">
            <div className="space-y-4 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-300 text-xs font-semibold tracking-wide">
                <svg className="w-3.5 h-3.5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Autonomous Higher Education OBE Architecture
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.15]">
                Academic Course Files &{' '}
                <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-amber-300 bg-clip-text text-transparent">
                  Attainment Analytics
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Streamline course descriptions, Bloom’s Taxonomy mapping, multi-exam assessment tools, and automated CO–PO–PSO calculation with publication-ready A4 documentation.
              </p>
            </div>

            {/* Interactive OBE Attainment Engine Card (Interactive Mockup) */}
            <div className="hidden sm:block rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-800/80 border border-slate-700/60 p-5 shadow-2xl backdrop-blur-xl max-w-xl">
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
                  <span className="text-xs font-semibold text-slate-200 tracking-wide uppercase">Live Attainment Preview</span>
                </div>
                <span className="text-[11px] font-medium text-amber-300/90 bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/20">
                  NBA Tier-1 Standard
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3">
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Direct Attainment</p>
                  <p className="mt-1 text-lg font-bold text-blue-400">82.4%</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">60% Tests + 20% TA</p>
                </div>
                <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3">
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Indirect Survey</p>
                  <p className="mt-1 text-lg font-bold text-indigo-400">76.0%</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">20% Exit Feedback</p>
                </div>
                <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3">
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Final Attainment</p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <p className="text-lg font-bold text-emerald-400">Level 3</p>
                    <span className="text-[10px] font-semibold text-emerald-500">81.1%</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Target &ge; 70% met</p>
                </div>
              </div>

              {/* Mini CO Progress Indicators */}
              <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">CO1</span>
                  <span className="text-[11px] text-slate-400">Remember &amp; Understand</span>
                </div>
                <div className="w-28 bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full" style={{ width: '88%' }} />
                </div>
                <span className="text-[11px] font-bold text-emerald-400">88% (L3)</span>
              </div>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid sm:grid-cols-3 gap-3.5 max-w-xl">
              {HIGHLIGHTS.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl bg-slate-900/40 border border-slate-800/60 p-3.5 backdrop-blur-sm transition-all duration-200 hover:border-slate-700 hover:bg-slate-900/60"
                >
                  <div className="h-8 w-8 rounded-lg bg-slate-800/80 flex items-center justify-center mb-2.5">
                    {item.icon}
                  </div>
                  <h2 className="text-xs font-semibold text-slate-200 leading-snug">{item.title}</h2>
                  <p className="mt-1 text-[11px] text-slate-400 leading-normal">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Floating Authentication Card (5 columns) */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-md">
              {children}
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 border-t border-slate-800/60">
        <p>&copy; {new Date().getFullYear()} Outcome Based Education System. All rights reserved.</p>
        <div className="flex items-center gap-4 text-slate-400">
          <span>NBA &amp; NAAC Alignment</span>
          <span>&bull;</span>
          <span>Role-Based Access</span>
          <span>&bull;</span>
          <span>Session Isolated Offerings</span>
        </div>
      </footer>
    </div>
  );
}
