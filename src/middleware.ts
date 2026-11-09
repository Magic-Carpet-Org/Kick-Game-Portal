import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const sessionToken =
    request.cookies.get('better-auth.session_token')?.value ||
    request.cookies.get('__Secure-better-auth.session_token')?.value;

  const isAuthenticated = Boolean(sessionToken);
  const pathname = request.nextUrl.pathname;

  // 1. Protect Admin Routes (/admin/*)
  if (
    pathname.startsWith('/admin/dashboard') ||
    pathname.startsWith('/admin/games') ||
    pathname.startsWith('/admin/users') ||
    pathname.startsWith('/admin/subadmins') ||
    pathname.startsWith('/admin/collections')
  ) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  // 2. Protect User Dashboard Routes (/dashboard/*)
  if (pathname.startsWith('/dashboard')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // 3. If authenticated user tries to visit login pages, redirect to dashboards
  if (pathname === '/admin' && isAuthenticated) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  if (pathname === '/' && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
