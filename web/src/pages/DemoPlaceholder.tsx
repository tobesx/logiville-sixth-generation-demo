import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Construction } from 'lucide-react'
import { demos } from './demos'
import './ico.css'
import './launcher.css'

export default function DemoPlaceholder() {
  const navigate = useNavigate()
  const { slug } = useParams()
  const demo = demos.find((d) => d.slug === slug)
  const Icon = demo?.icon ?? Construction

  return (
    <div className="ico-app launcher-root">
      <div className="launcher-content px-8 py-7 xl:px-14 xl:py-9">
        {/* Unobtrusive return control */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="ico-button ico-button-ghost launcher-rise inline-flex w-fit items-center gap-2"
          style={{ animationDelay: '0ms' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to launcher
        </button>

        <div className="flex flex-1 items-center justify-center">
          <div
            className="launcher-rise flex max-w-[46rem] flex-col items-center text-center"
            style={{ animationDelay: '120ms' }}
          >
            <div className="demo-icon-wrap flex h-20 w-20 items-center justify-center rounded-3xl border border-[rgba(237,174,73,0.35)] bg-[var(--accent-dim)] text-[var(--accent-brand)]">
              <Icon className="h-10 w-10" strokeWidth={1.5} />
            </div>

            <span className="ico-section-label mt-8">Demo · Coming soon</span>
            <h1 className="ico-heading mt-3 text-[40px] font-bold leading-tight text-[var(--text-white)] xl:text-[52px]">
              {demo?.title ?? 'Demo'}
            </h1>
            {demo ? (
              <p className="mt-3 ico-heading text-[18px] font-semibold text-[var(--accent-brand)] xl:text-[20px]">
                {demo.subtitle}
              </p>
            ) : null}
            <p className="mt-5 max-w-[52ch] font-['IBM_Plex_Sans'] text-[16px] leading-relaxed text-[var(--text-body)]">
              {demo?.description ??
                'This demo is part of the Sixth Generation showcase and will be available here soon.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
