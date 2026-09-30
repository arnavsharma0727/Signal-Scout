'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { saveDisplayTimeZone } from '../lib/display-timezone';
import { isDisplayTimeZone } from '../lib/time-zones';

export async function setDisplayTimeZone(formData: FormData) {
  const value = String(formData.get('timezone') ?? '');
  if (!isDisplayTimeZone(value)) redirect('/');
  await saveDisplayTimeZone(value);
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host')?.split(',')[0]?.trim() || requestHeaders.get('host');
  const referer = requestHeaders.get('referer');
  if (host && referer) {
    try {
      const url = new URL(referer);
      if (url.host === host) redirect(`${url.pathname}${url.search}${url.hash}`);
    } catch {
      // Fall through to the home page if the return path is absent or invalid.
    }
  }
  redirect('/');
}
