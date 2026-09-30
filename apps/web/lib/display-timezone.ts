import 'server-only';
import { cookies } from 'next/headers';
import { isDisplayTimeZone, type DisplayTimeZone } from './time-zones';

const COOKIE_NAME = 'signal-scout-timezone';

export async function getDisplayTimeZone(): Promise<DisplayTimeZone> {
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  return value && isDisplayTimeZone(value) ? value : 'UTC';
}

export async function saveDisplayTimeZone(value: DisplayTimeZone) {
  (await cookies()).set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}
