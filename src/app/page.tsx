import { redirect } from "next/navigation";
import { Dashboard } from "@/components/Dashboard";
import { isAllowedUser } from "@/lib/require-allowed-user";

export default async function Home() {
  if (!(await isAllowedUser())) redirect("/unauthorized");

  return (
    <div className="flex flex-1 flex-col bg-background text-foreground">
      <Dashboard />
    </div>
  );
}
