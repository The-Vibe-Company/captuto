'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Zap,
  BarChart3,
  Users,
  Folder,
  ChevronDown,
  HelpCircle,
  Settings,
} from 'lucide-react';

const primaryNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard?tab=tutorials', label: 'Tutorials', icon: Zap },
  { href: '/dashboard?tab=analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard?tab=team', label: 'Team', icon: Users },
];

const libraryNav = [
  { href: '/dashboard?folder=onboarding', label: 'Onboarding' },
  { href: '/dashboard?folder=support', label: 'Support guides' },
  { href: '/dashboard?folder=internal', label: 'Internal SOPs' },
];

interface DashboardSidebarProps {
  workspaceName?: string;
  workspaceRole?: string;
  workspaceInitials?: string;
}

export function DashboardSidebar({
  workspaceName = 'Personal',
  workspaceRole = 'Free plan',
  workspaceInitials = 'P',
}: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 flex-col gap-1 border-r border-stone-200/60 bg-white p-4 lg:flex">
      {/* Brand lockup */}
      <Link href="/dashboard" className="flex items-center gap-2.5 px-2 pt-2 pb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/captuto-mark.svg" alt="" className="h-7 w-7 rounded-md" />
        <span className="font-heading text-[17px] font-semibold tracking-tight text-stone-900">
          CapTuto
        </span>
        <span className="ml-auto rounded-full border border-brand-200/50 bg-brand-50 px-1.5 py-px text-[9px] font-medium text-brand-700">
          Beta
        </span>
      </Link>

      {/* Workspace switcher */}
      <button className="mb-3 flex items-center gap-2.5 rounded-[10px] border border-stone-200/60 bg-stone-50 px-2.5 py-2 text-left transition-colors hover:bg-stone-100">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-md text-[12px] font-semibold text-white shadow-sm font-heading"
          style={{ backgroundImage: 'var(--brand-gradient)' }}
        >
          {workspaceInitials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-stone-900">
            {workspaceName}
          </div>
          <div className="mt-0.5 truncate font-mono text-[11px] text-stone-500">
            {workspaceRole}
          </div>
        </div>
        <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-stone-400" />
      </button>

      {/* Primary nav */}
      {primaryNav.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors duration-150 ease-out-expo ${
              isActive
                ? 'bg-brand-50 text-brand-700'
                : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}

      {/* Library section */}
      <div className="mt-3 px-2.5 pt-3 pb-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-stone-400">
        Library
      </div>
      {libraryNav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
        >
          <Folder className="h-4 w-4" />
          <span className="truncate">{item.label}</span>
        </Link>
      ))}

      {/* Bottom: upgrade card */}
      <div className="mt-auto pt-4">
        <div
          className="rounded-xl p-3.5 text-white"
          style={{
            background:
              'linear-gradient(160deg, var(--brand-900), var(--brand-700))',
          }}
        >
          <h5 className="font-heading text-[13px] font-semibold leading-snug">
            Unlock Team plan
          </h5>
          <p className="mt-1 text-[11px] leading-snug text-white/65">
            Custom branding, analytics & 14 languages.
          </p>
          <button
            type="button"
            className="mt-2.5 w-full rounded-md bg-white px-2.5 py-1.5 text-[11px] font-semibold text-brand-700 transition-colors hover:bg-stone-50"
          >
            Start trial →
          </button>
        </div>
        <div className="mt-3 flex gap-1.5">
          <a
            href="https://vibetuto.notion.site/Centre-d-aide"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
          >
            <HelpCircle className="h-4 w-4" />
            Help
          </a>
          <Link
            href="/settings"
            className="flex items-center justify-center rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
