import {NextResponse} from 'next/server';
import bcrypt from 'bcryptjs';
import {prisma} from '@/lib/db';
import {createSession} from '@/lib/session';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = process.env.APP_URL ?? url.origin;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = request.headers.get('cookie')?.match(/digimart_oauth_state=([^;]+)/)?.[1];
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!code || !clientId || !clientSecret || !state || state !== cookieState) {
    return NextResponse.redirect(`${origin}/sign-in#google-failed`);
  }
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: `${origin}/api/auth/google/callback`, grant_type: 'authorization_code' }),
    });
    const tokens = await tokenRes.json() as { access_token?: string };
    if (!tokenRes.ok || !tokens.access_token) throw new Error('token exchange failed');
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    const profile = await profileRes.json() as { id?: string; email?: string; name?: string };
    if (!profileRes.ok || !profile.email || !profile.id) throw new Error('profile fetch failed');

    let user = await prisma.user.findUnique({ where: { email: profile.email } });
    if (!user) {
      user = await prisma.user.create({ data: {
        id: crypto.randomUUID(),
        // Google gives no phone — placeholder until the user sets one on the account page.
        phone: `G${profile.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 9).padEnd(9, '0')}`,
        email: profile.email,
        passwordHash: await bcrypt.hash(crypto.randomUUID() + crypto.randomUUID(), 10),
        role: 'CUSTOMER',
      } });
    }
    const token = await createSession({ id: user.id, phone: user.phone, role: user.role });
    const response = NextResponse.redirect(`${origin}/account#welcome-google`);
    response.cookies.set('digimart_session', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 7, path: '/' });
    response.cookies.delete('digimart_oauth_state');
    return response;
  } catch {
    return NextResponse.redirect(`${origin}/sign-in#google-failed`);
  }
}
