import { clerkMiddleware } from '@clerk/nextjs/server'

// Clerk is optional — all routes are public.
// Authenticated users simply get a higher rate limit (50 vs 10 debates/day).
export default clerkMiddleware()

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
