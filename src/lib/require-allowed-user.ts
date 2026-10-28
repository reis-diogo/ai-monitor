import { auth, currentUser } from "@clerk/nextjs/server";

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

const aiActivityEmails = (process.env.AI_ACTIVITY_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const EMAIL_CACHE_MS = 5 * 60_000;
const emailByUserId = new Map<string, { email: string | null; at: number }>();

export async function getAiActivityEmail(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const hit = emailByUserId.get(userId);
  let email: string | null;
  if (hit && Date.now() - hit.at < EMAIL_CACHE_MS) {
    email = hit.email;
  } else {
    email = await getCurrentUserEmail();
    emailByUserId.set(userId, { email, at: Date.now() });
  }

  return email && aiActivityEmails.includes(email) ? email : null;
}

export async function isAllowedUser(): Promise<boolean> {
  const email = await getCurrentUserEmail();
  return !!email && allowedEmails.includes(email);
}

export async function isPromptEditor(): Promise<boolean> {
  const email = await getCurrentUserEmail();
  if (!email || !allowedEmails.includes(email)) return false;
  return promptEditorEmails.includes(email);
}
