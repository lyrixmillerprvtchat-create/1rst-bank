'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Gift, TrendingUp, CreditCard, User } from 'lucide-react'

const tabs = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/rewards', icon: Gift, label: 'Rewards' },
  { href: '/finance', icon: TrendingUp, label: 'Finance' },
  { href: '/cards', icon: CreditCard, label: 'Cards' },
  { href: '/profile', icon: User, label: 'Me' },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 px-2 py-2 z-50">
      <div className="flex justify-around items-center">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-0.5 px-3 py-1">
              <Icon size={22} className={active ? 'text-blue-700' : 'text-gray-400'} />
              <span className={`text-[10px] font-medium ${active ? 'text-blue-700' : 'text-gray-400'}`}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
