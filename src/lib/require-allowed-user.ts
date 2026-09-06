import { currentUser } from "@clerk/nextjs/server";

const allowedEmails = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export async function getCurrentUserEmail(): Promise<string | null> {
  const user = await currentUser();
  return user?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? null;
}

const promptEditorEmails = (process.env.PROMPT_EDITOR_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export async function isAllowedUser(): Promise<boolean> {
  const email = await getCurrentUserEmail();
  return !!email && allowedEmails.includes(email);
}

export async function isPromptEditor(): Promise<boolean> {
  const email = await getCurrentUserEmail();
  if (!email || !allowedEmails.includes(email)) return false;
  return promptEditorEmails.includes(email);
}
