import Link from 'next/link'

export default function HomePage() {
  return (
    <main
      id="main-content"
      className="min-h-dvh flex flex-col items-center justify-center bg-space-black relative overflow-hidden"
    >
      {/* Starfield background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(13,21,38,0.8)_0%,_#05080F_70%)]"
      />

      {/* Subtle grid */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,245,212,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,212,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Hero content */}
      <div className="relative z-10 text-center px-6 max-w-3xl">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 rounded-full glass border-neon-cyan/20 border">
          <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" aria-hidden="true" />
          <span className="font-mono text-carbon-label text-neon-cyan tracking-widest uppercase">
            Google PromptWars 2026
          </span>
        </div>

        {/* Logo */}
        <h1 className="font-display text-carbon-display md:text-[64px] font-extrabold text-text-primary mb-4">
          Eco
          <span className="text-neon-cyan text-glow-cyan">Pulse</span>
        </h1>

        {/* Tagline */}
        <p className="text-text-secondary text-xl md:text-2xl font-body mb-12 leading-relaxed">
          Fitbit for your carbon footprint, with an{' '}
          <span className="text-neon-purple">AI coaching staff</span> that works while you sleep.
        </p>

        {/* Feature pills */}
        <div
          className="flex flex-wrap justify-center gap-3 mb-12"
          aria-label="Key features"
        >
          {[
            { label: '📸 Snap-to-Carbon', desc: 'Photo → CO₂e in <3s' },
            { label: '🌍 Parallel-You Simulator', desc: 'Dual globes, 12-month trajectory' },
            { label: '💬 Carbon Conversations', desc: 'Grounded Q&A over your data' },
          ].map((f) => (
            <div
              key={f.label}
              className="glass px-4 py-2.5 rounded-full text-sm font-body text-text-secondary"
              title={f.desc}
            >
              {f.label}
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="px-8 py-3.5 rounded-xl bg-neon-cyan text-space-black font-display font-bold text-base tracking-wide hover:shadow-neon-cyan-lg transition-all duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-space-black"
          >
            Open Dashboard
          </Link>
          <a
            href="/docs"
            className="px-8 py-3.5 rounded-xl glass border border-neon-cyan/20 text-neon-cyan font-display font-semibold text-base hover:bg-neon-cyan/10 hover:border-neon-cyan/40 transition-all duration-200"
          >
            View Docs
          </a>
        </div>

        {/* Sprint status */}
        <p className="mt-16 font-mono text-carbon-label text-text-muted tracking-widest uppercase">
          Sprint 1 — Foundation ·{' '}
          <span className="text-neon-cyan">CI/CD Active</span>
        </p>
      </div>
    </main>
  )
}
