import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// A ingestao e o progresso do arquiteto sao chamados pela IA local do usuario, fora
// do navegador, entao nao tem sessao do Clerk. Eles se autenticam pelo token do lote
// (hash no banco, escopo fixo de cards, validade curta). O GET de /progress e da tela
// e checa isAllowedUser dentro do proprio handler — ver app/api/architect/progress.
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/unauthorized",
  "/api/architect/ingest",
  "/api/architect/progress",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)", "/__clerk/:path*"],
};
