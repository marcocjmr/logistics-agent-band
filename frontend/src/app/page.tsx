"use client";

import React, { useEffect, useRef, useState } from "react";

export default function LandingPage() {
  const [agentsVisible, setAgentsVisible] = useState(false);
  const agentsSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAgentsVisible(true);
          if (agentsSectionRef.current) {
            observer.unobserve(agentsSectionRef.current);
          }
        }
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    if (agentsSectionRef.current) {
      observer.observe(agentsSectionRef.current);
    }

    return () => {
      if (agentsSectionRef.current) {
        observer.unobserve(agentsSectionRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-white text-black font-sans antialiased selection:bg-zinc-100 transition-all duration-300">
      {/* HEADER */}
      <header className="flex-shrink-0 flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-150 z-30">
        <a href="/" className="transition-all duration-300 hover:scale-[1.02]" title="Nexis Home">
          <img 
            src="/logonexis.jpeg" 
            alt="Nexis Logo" 
            className="h-9 w-auto rounded-lg object-contain" 
          />
        </a>

        {/* Premium Corporate Navigation */}
        <nav className="flex items-center gap-6">
          <a href="/" className="text-xs font-bold text-black border-b-2 border-black pb-0.5">
            Home
          </a>
          <a href="/dashboard" className="text-xs font-semibold text-zinc-500 hover:text-black transition-all">
            Navigator
          </a>
          <a href="/history" className="text-xs font-semibold text-zinc-500 hover:text-black transition-all">
            History
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="/dashboard"
            className="px-4 py-2 rounded-full text-xs font-semibold bg-zinc-950 hover:bg-black border border-zinc-800 hover:border-zinc-700 text-white active:scale-[0.98] transition-all shadow-sm flex items-center gap-1.5 group"
          >
            <span>Launch Navigator</span>
            <svg className="w-3 h-3 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="flex-1 flex flex-col justify-center px-8 max-w-6xl mx-auto py-16 lg:py-24 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Hero Content */}
          <div className="lg:col-span-7 flex flex-col gap-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-150 bg-zinc-50 text-zinc-650 w-fit animate-fade-in-up">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span className="text-[9px] font-bold tracking-wider uppercase font-mono">
                Track 1: Internal Enterprise Workflows
              </span>
            </div>

            <h2 className="text-4xl lg:text-6xl font-extrabold tracking-tight text-black leading-[1.08] max-w-xl animate-fade-in-up delay-100">
              Corporate Relocation. <br/>
              <span className="text-zinc-400">Orchestrated by Swarms.</span>
            </h2>

            <p className="text-sm lg:text-base text-zinc-500 max-w-lg leading-relaxed animate-fade-in-up delay-200">
              Nexis coordinates autonomous specialized agents through Band.ai to plan, optimize, and audit corporate travel itineraries, automatically aligning with financial compliance policies in real-time.
            </p>

            <div className="flex items-center gap-4 mt-2 animate-fade-in-up delay-300">
              <a
                href="/dashboard"
                className="px-6 py-3 rounded-xl text-xs font-bold bg-zinc-950 hover:bg-black border border-zinc-800 hover:border-zinc-700 text-white active:scale-[0.98] transition-all shadow-md flex items-center gap-2 group"
              >
                <span>Launch Swarm Dashboard</span>
                <svg className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </a>
              <a
                href="#agents"
                className="px-5 py-3 rounded-xl text-xs font-semibold border border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-black transition-all"
              >
                Meet the Swarm
              </a>
            </div>
          </div>

          {/* Hero Visual Mockup */}
          <div className="lg:col-span-5 flex justify-center relative animate-scale-in delay-200">
            <div className="w-full max-w-[380px] bg-zinc-50 border border-zinc-200 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col gap-4 select-none animate-float">
              {/* Graphic Flow Lines */}
              <div className="absolute inset-0 bg-radial-gradient from-zinc-100/50 to-transparent pointer-events-none" />
              
              <div className="flex justify-between items-center pb-3 border-b border-zinc-200 animate-fade-in-up delay-300">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Swarm Coordination Active</span>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-[8px] border border-emerald-200 font-extrabold text-emerald-600 animate-pulse">Consensus</span>
              </div>

              {/* Ingestion status mockup */}
              <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-white border border-zinc-150 shadow-sm relative z-10 hover:border-zinc-300 transition-all animate-fade-in-up delay-400">
                <div className="flex justify-between items-center text-[8px] font-bold text-zinc-400 uppercase">
                  <span>Requirements Ingested</span>
                  <span className="text-zinc-650">Qwen-2.5</span>
                </div>
                <p className="text-[10px] text-zinc-800 font-mono italic">"Trip from NY to Monterrey, budget $1500 USD"</p>
              </div>

              {/* Transit status mockup */}
              <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-white border border-zinc-150 shadow-sm relative z-10 hover:border-zinc-300 transition-all animate-fade-in-up delay-500">
                <div className="flex justify-between items-center text-[8px] font-bold text-zinc-400 uppercase">
                  <span>Optimal Transit Found</span>
                  <span className="text-zinc-650">GPT-4o-mini</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold">Delta Air Lines</span>
                  <span className="text-[10px] font-mono font-bold">$600 USD</span>
                </div>
              </div>

              {/* Lodging status mockup */}
              <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-white border border-zinc-150 shadow-sm relative z-10 hover:border-zinc-300 transition-all animate-fade-in-up delay-600">
                <div className="flex justify-between items-center text-[8px] font-bold text-zinc-400 uppercase">
                  <span>Lodging Selected</span>
                  <span className="text-zinc-650">GPT-4o-mini</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold">Hotel Plaza Monterrey</span>
                  <span className="text-[10px] font-mono font-bold">$500 USD</span>
                </div>
              </div>

              {/* Auditor seal mockup */}
              <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-zinc-900 border border-black shadow-sm text-white relative z-10 hover:brightness-110 transition-all animate-fade-in-up delay-700">
                <div className="flex justify-between items-center text-[8px] font-bold text-zinc-500 uppercase">
                  <span>Audit Result</span>
                  <span className="text-emerald-400">Approved</span>
                </div>
                <p className="text-[9px] text-zinc-300 font-mono leading-relaxed">
                  "Aggregate cost ($1100) satisfies policy limits."
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MEET THE SWARM AGENTS */}
      <section id="agents" ref={agentsSectionRef} className="bg-zinc-50 border-t border-zinc-150 py-16 px-8">
        <div className="max-w-6xl mx-auto flex flex-col gap-12">
          <div className={`flex flex-col gap-2 max-w-xl transition-all duration-700 transform ${agentsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h3 className="text-2xl font-bold tracking-tight text-black">
              Collaborative Swarm Intelligence
            </h3>
            <p className="text-xs lg:text-sm text-zinc-500 leading-relaxed">
              Nexis orchestrates 4 independent, specialized agents configured through the Band room. They share state payload, evaluate alternatives, and reach consensus without human overhead.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Agent 1 */}
            <div className={`bg-white border border-zinc-200 rounded-2xl p-5 flex flex-col gap-4 hover:shadow-md transition-all duration-700 delay-100 transform ${agentsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center font-mono font-bold text-xs">
                AN
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-sm font-bold text-black">Requirements Analyst</h4>
                <span className="text-[9px] font-bold text-zinc-400 uppercase font-mono">Powered by Featherless</span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Ingests unstructured natural language requests and converts them into a structured JSON state payload.
              </p>
            </div>

            {/* Agent 2 */}
            <div className={`bg-white border border-zinc-200 rounded-2xl p-5 flex flex-col gap-4 hover:shadow-md transition-all duration-700 delay-200 transform ${agentsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center font-mono font-bold text-xs">
                TR
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-sm font-bold text-black">Transit Planner</h4>
                <span className="text-[9px] font-bold text-zinc-400 uppercase font-mono">Powered by AI/ML API</span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Evaluates flight connections and optimal routing between origin and destination hubs.
              </p>
            </div>

            {/* Agent 3 */}
            <div className={`bg-white border border-zinc-200 rounded-2xl p-5 flex flex-col gap-4 hover:shadow-md transition-all duration-700 delay-300 transform ${agentsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center font-mono font-bold text-xs">
                AC
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-sm font-bold text-black">Accommodation Scout</h4>
                <span className="text-[9px] font-bold text-zinc-400 uppercase font-mono">Powered by AI/ML API</span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Locates business-compliant hotel proposals near targeted company relocation zones.
              </p>
            </div>

            {/* Agent 4 */}
            <div className={`bg-white border border-zinc-200 rounded-2xl p-5 flex flex-col gap-4 hover:shadow-md transition-all duration-700 delay-400 transform ${agentsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center font-mono font-bold text-xs">
                AU
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-sm font-bold text-black">Financial Auditor</h4>
                <span className="text-[9px] font-bold text-zinc-400 uppercase font-mono">Powered by AI/ML API</span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Audits aggregate expenses. Enforces budget loops and dynamically applies caps on policy breaches.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="flex-shrink-0 py-8 px-8 border-t border-zinc-200 text-center text-[10px] text-zinc-400 uppercase tracking-widest font-semibold bg-white">
        Nexis © 2026 | Developed for the lablab.ai Band of Agents Hackathon
      </footer>
    </div>
  );
}

