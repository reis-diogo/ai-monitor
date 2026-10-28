import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AiActivityPanel } from "@/components/ai-activity/AiActivityPanel";
import { getAiActivityEmail } from "@/lib/require-allowed-user";

export const metadata: Metadata = { title: "Atividade de IA" };

export default async function AiActivityPage() {
  if (!(await getAiActivityEmail())) notFound();

  return (
    <div className="flex flex-1 flex-col bg-background text-foreground">
      <AiActivityPanel />
    </div>
  );
}
