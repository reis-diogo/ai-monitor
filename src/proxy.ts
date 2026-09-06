import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// A ingestao do arquiteto e chamada pela IA local do usuario, fora do navegador,
// entao nao tem sessao do Clerk. Ela se autentica pelo token do lote (hash no banco,
// escopo fixo de cards, validade curta) — ver app/api/architect/ingest.
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/unauthorized",
  "/api/architect/ingest",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)", "/__clerk/:path*"],
};
