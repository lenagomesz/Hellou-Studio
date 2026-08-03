import { EmailMarketingPreference } from '@/components/shop/EmailMarketingPreference';

export default function AccountPreferencesPage() {
  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold text-gray-900 sm:text-2xl dark:text-white">Preferências</h1><p className="mt-1 text-sm text-gray-500">Controle como a Hellou Studio pode falar com você.</p></div>
      <EmailMarketingPreference />
    </div>
  );
}
