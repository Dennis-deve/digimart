import {NextResponse} from 'next/server';

// Starts the Google OAuth flow. Requires GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (Google Cloud Console).
export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const origin = process.env.APP_URL ?? new URL(request.url).origin;
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(`${origin}/sign-in#google-not-configured`);
  }
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  response.cookies.set('digimart_oauth_state', state, { httpOnly: true, sameSite: 'lax', maxAge: 600, path: '/' });
  return response;
}
