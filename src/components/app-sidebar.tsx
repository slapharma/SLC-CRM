"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Handshake,
  LayoutDashboard,
  Map as MapIcon,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Store,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/map", label: "Map", icon: MapIcon },
    ],
  },
  {
    label: "Records",
    items: [
      { href: "/companies", label: "Companies", icon: Building2 },
      { href: "/contacts", label: "Contacts", icon: Users },
      { href: "/listings", label: "Listings", icon: Store },
      { href: "/enquiries", label: "Enquiries", icon: Target },
      { href: "/kyc", label: "KYC", icon: ScrollText },
    ],
  },
  {
    label: "Dealflow",
    items: [
      { href: "/matches", label: "MatchMaker", icon: Sparkles },
      { href: "/deals", label: "PipeLine", icon: Handshake },
    ],
  },
];

export function AppSidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const groups: NavGroup[] = isAdmin
    ? [
        ...NAV,
        {
          label: "Settings",
          items: [{ href: "/admin", label: "Admin", icon: ShieldCheck }],
        },
      ]
    : NAV;

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Building2 className="h-4 w-4" />
        </div>
        <span className="font-semibold tracking-tight text-foreground">CliftonAi-CRM</span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                      )}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t p-3 text-[11px] text-muted-foreground">
        UK leisure &amp; licensed property
      </div>
    </aside>
  );
}
