export { auth as middleware } from "@/auth";

export const config = {
  matcher: [
    // Protect everything except public routes and Next.js internals
    "/((?!api/auth|api/cli|login|signup|_next/static|_next/image|favicon.ico).*)",
  ],
};
