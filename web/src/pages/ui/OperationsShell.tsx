import { NavLink, Outlet } from 'react-router-dom'
import { PhoneOutgoing, Users } from 'lucide-react'
import { cn } from '../../lib/shadcn/utils'
import '../ico.css'

const navigationItems = [
  { to: '/', label: 'Planning', icon: PhoneOutgoing },
  { to: '/people', label: 'People', icon: Users },
]

export default function OperationsShell() {
  return (
    <div className="ico-app flex h-screen w-screen overflow-hidden">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-[220px] flex-col border-r border-[var(--border-brand)] bg-[var(--bg-deep)] px-4 py-5">
        <div>
          <div className="flex items-center">
            <img
              src="/sixth-generation-logo.png"
              alt="Sixth Generation logo"
              className="h-8 w-auto object-contain"
            />
          </div>
          <div className="my-4 h-px bg-[var(--border-brand)]" />
          <nav className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-4 py-[10px] text-sm transition-colors hover:bg-white/[0.04]',
                      isActive
                        ? 'border-l-[3px] border-[var(--accent-brand)] bg-[rgba(237,174,73,0.08)] font-semibold text-[var(--text-white)] ico-heading'
                        : 'font-normal text-[var(--text-body)]',
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>
        <div className="mt-auto font-['IBM_Plex_Sans'] text-[11px] text-[var(--border-brand)]">
          Sixth Generation © 2026
        </div>
      </aside>
      <main className="ico-scrollbar ml-[220px] h-screen flex-1 overflow-y-auto bg-[var(--bg-page)]">
        <Outlet />
      </main>
    </div>
  )
}
