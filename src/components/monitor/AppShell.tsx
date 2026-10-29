"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { UserButton } from "@clerk/nextjs";
import { ConfigModal } from "@/components/monitor/ConfigModal";
import { Icon } from "@/components/monitor/Icon";

const NAV = [
  { href: "/", label: "Mapa", icon: "map" },
];

function NavItem({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative flex h-14 w-12 shrink-0 flex-col items-center justify-center gap-[3px] rounded-lg transition-colors md:w-16 ${
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          className="absolute inset-0 rounded-lg bg-primary/12"
          transition={{ type: "spring", stiffness: 500, damping: 36 }}
        />
      )}
      <Icon name={icon} size={22} className="relative" />
      <span className="relative text-[10px] font-semibold tracking-[0.04em]">{label}</span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [configOpen, setConfigOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col gap-4 bg-background p-3 text-foreground md:flex-row md:p-4">
      <div className="group fixed inset-y-0 left-0 z-40 w-4 transition-[width] focus-within:w-[112px] hover:w-[112px] max-md:static max-md:w-full">
      <nav className="flex w-full shrink-0 flex-row items-center gap-0.5 overflow-x-auto rounded-[14px] border border-border bg-card px-2 py-2 md:absolute md:bottom-4 md:left-4 md:top-4 md:w-[84px] md:-translate-x-[135%] md:flex-col md:gap-1.5 md:overflow-visible md:px-0 md:py-4 md:shadow-[0_12px_32px_var(--shadow-pop)] md:transition-transform md:duration-200 md:group-focus-within:translate-x-0 md:group-hover:translate-x-0">
        <div className="mr-1 flex size-9 shrink-0 scale-[0.82] items-center justify-center md:mb-3.5 md:mr-0 md:size-11 md:scale-100">
          <UserButton
            appearance={{
              elements: { avatarBox: { width: 44, height: 44 } },
            }}
          />
        </div>
        {NAV.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            active={item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)}
          />
        ))}
      </nav>
      </div>
      <button
        type="button"
        onClick={() => setConfigOpen(true)}
        aria-label="Configurações"
        title="Configurações"
        aria-haspopup="dialog"
        className="fixed right-6 top-6 z-20 flex size-10 items-center justify-center rounded-[10px] border border-line-input bg-card text-muted-foreground transition-colors hover:border-primary hover:text-foreground md:right-8 md:top-8"
      >
        <Icon name="settings" size={20} />
      </button>
      <ConfigModal open={configOpen} onClose={() => setConfigOpen(false)} />
      <div className="flex min-w-0 flex-1">{children}</div>
    </div>
  );
}
