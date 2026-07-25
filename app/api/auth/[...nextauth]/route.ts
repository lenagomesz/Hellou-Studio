import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);

function withNoStore(response: Response) {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

export async function GET(request: Request, context: unknown) {
  return withNoStore(await handler(request, context));
}

export async function POST(request: Request, context: unknown) {
  return withNoStore(await handler(request, context));
}
