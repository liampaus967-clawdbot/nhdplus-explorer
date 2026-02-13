import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (authHeader) {
    const [scheme, encoded] = authHeader.split(' ');
    
    if (scheme === 'Basic') {
      const decoded = atob(encoded);
      const [user, password] = decoded.split(':');
      
      // Password check (username can be anything)
      if (password === process.env.AUTH_PASSWORD) {
        return NextResponse.next();
      }
    }
  }
  
  // Return 401 with WWW-Authenticate header to trigger browser login prompt
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="NHDPlus Explorer"',
    },
  });
}

// Apply to all routes except static files and API routes you want public
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
