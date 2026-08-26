import { useNavigate } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import type { Demo } from './demos'
import { demos } from './demos'
import './ico.css'
import './launcher.css'

const SIXTH_LOGO =
  '/sixth-generation-logo.png'

function FeaturedCard({ demo, onOpen, delay }: { demo: Demo; onOpen: () => void; delay: number }) {
  const Icon = demo.icon
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{ animationDelay: `${delay}ms` }}
      className="demo-card demo-card-featured launcher-rise group h-full w-full p-8 xl:p-10 2xl:p-12"
    >
      <Icon className="featured-outline-icon h-56 w-56" strokeWidth={1} />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between">
          <span className="launcher-pill">
            <Sparkles className="h-3.5 w-3.5" />
            Featured demo
          </span>
          <div className="demo-icon-wrap flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(237,174,73,0.35)] bg-[var(--accent-dim)] text-[var(--accent-brand)]">
            <Icon className="h-7 w-7" strokeWidth={1.6} />
          </div>
        </div>

        <div className="mt-auto">
          <h2 className="ico-heading text-[40px] font-bold leading-[1.05] text-[var(--text-white)] xl:text-[48px] 2xl:text-[56px]">
            {demo.title}
          </h2>
          <p className="mt-3 ico-heading text-[18px] font-semibold text-[var(--accent-brand)] xl:text-[20px]">
            {demo.subtitle}
          </p>
          <p className="mt-4 max-w-[34ch] font-['IBM_Plex_Sans'] text-[15px] leading-relaxed text-[var(--text-body)] xl:text-[16px]">
            {demo.description}
          </p>
          <span className="demo-cta ico-heading mt-8 inline-flex items-center gap-2 text-[17px] font-bold text-[var(--text-white)]">
            {demo.cta}
            <ArrowRight className="demo-cta-arrow h-5 w-5" />
          </span>
        </div>
      </div>
    </button>
  )
}

function CompactCard({ demo, onOpen, delay }: { demo: Demo; onOpen: () => void; delay: number }) {
  const Icon = demo.icon
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{ animationDelay: `${delay}ms` }}
      className="demo-card launcher-rise group w-full flex-1 p-6 xl:p-7"
    >
      <div className="flex h-full items-start gap-5">
        <div className="demo-icon-wrap flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--border-brand)] bg-[var(--bg-deep)] text-[var(--text-body)]">
          <Icon className="h-6 w-6" strokeWidth={1.6} />
        </div>
        <div className="flex h-full min-w-0 flex-col">
          <h3 className="ico-heading text-[22px] font-bold leading-tight text-[var(--text-white)] xl:text-[24px]">
            {demo.title}
          </h3>
          <p className="mt-1 ico-heading text-[13px] font-semibold text-[var(--accent-brand)]">
            {demo.subtitle}
          </p>
          <p className="ico-truncate-two mt-2 font-['IBM_Plex_Sans'] text-[13px] leading-snug text-[var(--text-muted)] xl:text-[14px]">
            {demo.description}
          </p>
          <span className="demo-cta mt-auto inline-flex items-center gap-1.5 pt-3 font-['IBM_Plex_Sans'] text-[13px] font-semibold text-[var(--text-body)]">
            {demo.cta}
            <ArrowRight className="demo-cta-arrow h-4 w-4" />
          </span>
        </div>
      </div>
    </button>
  )
}

export default function Launcher() {
  const navigate = useNavigate()
  const featured = demos.find((d) => d.featured)
  const rest = demos.filter((d) => !d.featured)

  return (
    <div className="ico-app launcher-root">
      <div className="launcher-content px-8 py-7 xl:px-14 xl:py-9 2xl:px-20 2xl:py-11">
        {/* Hero */}
        <header className="launcher-rise shrink-0" style={{ animationDelay: '0ms' }}>
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <img
                src={SIXTH_LOGO}
                alt="Sixth Generation"
                className="h-9 w-auto object-contain xl:h-10"
              />
            </div>
            <span className="ico-section-label hidden sm:block">Logiville · Live demo</span>
          </div>

          <div className="mt-6 xl:mt-8">
            <h1 className="ico-heading max-w-[22ch] text-[34px] font-bold leading-[1.05] text-[var(--text-white)] xl:text-[44px] 2xl:text-[52px]">
              Intelligent software for logistics &amp; manufacturing
            </h1>
            <p className="mt-3 max-w-[62ch] font-['IBM_Plex_Sans'] text-[15px] leading-relaxed text-[var(--text-body)] xl:text-[17px]">
              Explore how custom software, automation and AI can improve real-world operations.
            </p>
          </div>
        </header>

        {/* Demo launcher grid */}
        <div className="mt-7 grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-2 xl:mt-9 xl:gap-6">
          {featured ? (
            <FeaturedCard demo={featured} onOpen={() => navigate(featured.path)} delay={120} />
          ) : null}
          <div className="flex min-h-0 flex-col gap-5 xl:gap-6">
            {rest.map((demo, i) => (
              <CompactCard
                key={demo.slug}
                demo={demo}
                onOpen={() => navigate(demo.path)}
                delay={220 + i * 110}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
