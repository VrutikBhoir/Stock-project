import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

export default clerkMiddleware(
  (auth, req) => {
    // Your middleware logic here
  },
  {
    publicRoutes: [
      '/',
      '/sign-in(.*)',
      '/sign-up(.*)',
      '/api/(.*)'
    ],
  }
);
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('token')

  // Allow these pages
  if (pathname === '/' || pathname === '/login') {
    return NextResponse.next()
  }

  // Protect dashboard
  if (!token && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: [
    '/dashboard',
    '/screener',
    '/account',
    // Also run for everything else (keeps original behavior for static/_next skip)
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)'
  ],
};