import { NextResponse } from 'next/server';

function constantTimeEqual(left, right) {
  if (!left || !right || left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return difference === 0;
}

function authorized(request) {
  const expected = process.env.DOWNLOAD_ANALYTICS_API_KEY;
  const provided = request.headers.get('x-api-key') || '';
  const authorization = request.headers.get('authorization') || '';
  const bearer = authorization.replace(/^Bearer\s+/i, '');
  return Boolean(expected)
    && (constantTimeEqual(provided, expected) || constantTimeEqual(bearer, expected));
}

export function middleware(request) {
  const response = NextResponse.next();
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), geolocation=()');
  if (request.nextUrl.pathname.startsWith('/api/analytics') && !authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
