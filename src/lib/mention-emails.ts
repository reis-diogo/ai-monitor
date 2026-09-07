import { resolveAuthorName } from "@/lib/normalize-author";
import type { Professional } from "@/lib/types";

/**
 * Emails para mencionar, a partir dos nomes de autor que aparecem na atividade.
 *
 * Um mesmo humano existe varias vezes em professionals — o login do GitHub, o
 * nome no ClickUp — e so uma dessas linhas costuma ter o email. O alias canonico
 * e o que amarra as duas: resolvemos cada nome ao alias e procuramos o email de
 * qualquer linha que caia no mesmo alias.
 */
export function resolveMentionEmails(
  authorNames: string[],
  professionals: Professional[]
): string[] {
  const emailByCanonical = new Map<string, string>();
  for (const professional of professionals) {
    const email = professional.clickupEmail?.trim().toLowerCase();
    if (!email) continue;
    const canonical = resolveAuthorName(professional.authorName, professionals).toLowerCase();
    if (!emailByCanonical.has(canonical)) emailByCanonical.set(canonical, email);
  }

  const emails = new Set<string>();
  for (const name of authorNames) {
    const canonical = resolveAuthorName(name, professionals).toLowerCase();
    const email = emailByCanonical.get(canonical);
    if (email) emails.add(email);
  }

  return Array.from(emails).sort();
}
