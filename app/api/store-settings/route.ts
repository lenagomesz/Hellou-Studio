import { NextResponse } from 'next/server';
import { getStoreSettings } from '@/lib/store-settings';

export async function GET() {
  const settings = await getStoreSettings();
  return NextResponse.json({
    identity: settings.identity,
    contact: settings.contact,
    commerce: settings.commerce,
    shipping: settings.shipping,
    payments: settings.payments,
    navigation: settings.navigation,
  });
}

