// EXEMPLO DE RATE LIMITING - Para implementar em produção

/**
 * Quando pronto para produção, instale:
 * npm install @upstash/ratelimit @upstash/redis
 * 
 * Adicione em .env:
 * UPSTASH_REDIS_REST_URL=...
 * UPSTASH_REDIS_REST_TOKEN=...
 */

// import { Ratelimit } from '@upstash/ratelimit';
// import { Redis } from '@upstash/redis';

// const redis = new Redis({
//   url: process.env.UPSTASH_REDIS_REST_URL!,
//   token: process.env.UPSTASH_REDIS_REST_TOKEN!,
// });

// // Login: 5 tentativas por hora
// export const loginLimiter = new Ratelimit({
//   redis,
//   limiter: Ratelimit.slidingWindow(5, '1h'),
//   analytics: true,
//   prefix: 'ratelimit:login',
// });

// // API geral: 100 requests por hora
// export const apiLimiter = new Ratelimit({
//   redis,
//   limiter: Ratelimit.slidingWindow(100, '1h'),
//   analytics: true,
//   prefix: 'ratelimit:api',
// });

// // Checkout: 10 tentativas por hora
// export const checkoutLimiter = new Ratelimit({
//   redis,
//   limiter: Ratelimit.slidingWindow(10, '1h'),
//   analytics: true,
//   prefix: 'ratelimit:checkout',
// });

// // Uso em API route:
// export async function POST(req: NextRequest) {
//   const ip = req.ip || 'unknown';
//   const { success, limit, reset, remaining } = await loginLimiter.limit(ip);
//   
//   if (!success) {
//     return new NextResponse(
//       JSON.stringify({ error: 'Too many requests' }),
//       {
//         status: 429,
//         headers: {
//           'X-RateLimit-Limit': limit.toString(),
//           'X-RateLimit-Remaining': remaining.toString(),
//           'X-RateLimit-Reset': new Date(reset).toISOString(),
//         },
//       }
//     );
//   }
//   
//   // Continuar com a lógica...
// }
