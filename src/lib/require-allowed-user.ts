import { currentUser } from "@clerk/nextjs/server";

const allowedEmails = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export async function getCurrentUserEmail(): Promise<string | null> {
  const user = await currentUser();
  return user?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? null;
}

export async function isAllowedUser(): Promise<boolean> {
  const email = await getCurrentUserEmail();
  return !!email && allowedEmails.includes(email);
}
