'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavBar() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/routes', label: 'Routes' },
    { href: '/students', label: 'Students' },
    { href: '/attendance', label: 'Attendance' },
    { href: '/simulate', label: 'Simulate' },
  ];

  return (
    <nav className="bg-white border-b border-[var(--border)] px-6 py-3 flex items-center gap-6">
      <Link href="/" className="text-lg font-bold text-[var(--primary)]">
        BusNav
      </Link>
      <div className="flex gap-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              pathname === link.href
                ? 'bg-[var(--primary)] text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
