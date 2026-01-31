'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LoginButton from './LoginButton';

interface NavItem {
  href: string;
  label: string;
}

const navItems: NavItem[] = [
  { href: '/library', label: 'Library' },
  { href: '/needs-rating', label: 'Needs Rating' },
  { href: '/settings', label: 'Settings' },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <header className="hidden md:block fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-netflix-black/90 to-transparent">
      <nav className="flex items-center justify-between px-4 md:px-12 py-4">
        {/* Logo / Brand */}
        <Link
          href="/library"
          className="text-netflix-red font-bold text-2xl md:text-3xl tracking-tight hover:text-netflix-red-hover"
        >
          AudioBooks
        </Link>

        {/* Navigation Links */}
        <ul className="flex items-center gap-1 md:gap-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname?.startsWith(item.href));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    px-3 py-2 rounded-md text-sm md:text-base font-medium
                    transition-colors duration-200
                    ${isActive
                      ? 'text-white bg-netflix-gray'
                      : 'text-netflix-light-gray hover:text-white hover:bg-netflix-gray/50'
                    }
                  `}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li>
            <LoginButton />
          </li>
        </ul>
      </nav>
    </header>
  );
}
