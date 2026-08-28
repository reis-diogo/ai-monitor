"use client";

import { SignOutButton } from "@clerk/nextjs";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <p className="text-sm text-black/60 dark:text-white/60">
        Seu e-mail não tem acesso a este app.
      </p>
      <SignOutButton>
        <button className="rounded-md border border-black/10 dark:border-white/10 px-3 py-1.5 text-xs hover:border-black/30 dark:hover:border-white/30">
          Sair
        </button>
      </SignOutButton>
    </div>
  );
}
