import { getProfessionals } from "@/lib/professionals-store";
import {
  getCurrentUserEmail,
  isPromptEditor,
} from "@/lib/require-allowed-user";

export async function canDecideArchitecture(): Promise<boolean> {
  if (await isPromptEditor()) return true;
  const email = await getCurrentUserEmail();
  if (!email) return false;
  const professionals = await getProfessionals();
  return professionals.some(
    (person) =>
      person.isArchitect && person.clickupEmail?.toLowerCase() === email,
  );
}
