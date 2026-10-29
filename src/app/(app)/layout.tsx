import { redirect } from "next/navigation";
import { MonitorProvider } from "@/components/Dashboard";
import { AppShell } from "@/components/monitor/AppShell";
import { isAllowedUser } from "@/lib/require-allowed-user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAllowedUser())) redirect("/unauthorized");

  return (
    <MonitorProvider>
      <AppShell>{children}</AppShell>
    </MonitorProvider>
  );
}
