import type { Professional } from "@/lib/types";

export function resolveAuthorName(rawName: string, professionals: Professional[]): string {
  const owner = professionals.find((p) => p.authorName.toLowerCase() === rawName.toLowerCase());
  if (owner?.aliases && owner.aliases.length > 0) {
    return owner.aliases[0];
  }

  const aliasOwner = professionals.find((p) =>
    p.aliases?.some((alias) => alias.toLowerCase() === rawName.toLowerCase())
  );
  if (aliasOwner?.aliases && aliasOwner.aliases.length > 0) {
    return aliasOwner.aliases[0];
  }

  return rawName;
}
