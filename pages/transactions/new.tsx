// New transaction page
import { useState } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/lib/auth';
import { PropertyType, TransactionType } from '@/lib/transactions/types';
import { Home, Building, TreePine, Store, HelpCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const PROPERTY_TYPES: { value: PropertyType; icon: React.ReactNode }[] = [
  { value: 'house', icon: <Home className="w-6 h-6" /> },
  { value: 'apartment', icon: <Building className="w-6 h-6" /> },
  { value: 'land', icon: <TreePine className="w-6 h-6" /> },
  { value: 'commercial', icon: <Store className="w-6 h-6" /> },
  { value: 'other', icon: <HelpCircle className="w-6 h-6" /> },
];

export default function NewTransactionPage() {
  const { t } = useTranslation('transactions');
  const { session } = useAuth();
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form data
  const [transactionType, setTransactionType] = useState<TransactionType>('purchase');
  const [propertyType, setPropertyType] = useState<PropertyType | null>(null);
  const [propertyAddress, setPropertyAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [listingPrice, setListingPrice] = useState('');

  const handleSubmit = async () => {
    if (!session?.access_token) {
      setError('You must be logged in to create a transaction');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          transaction_type: transactionType,
          property_type: propertyType,
          property_address: propertyAddress || undefined,
          neighborhood: neighborhood || undefined,
          city: city || undefined,
          listing_price: listingPrice ? parseFloat(listingPrice) : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create transaction');
      }

      const transaction = await response.json();
      router.push(`/transactions/${transaction.id}`);
    } catch (err: any) {
      console.error('Create transaction error:', err);
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return transactionType !== null;
      case 2:
        return propertyType !== null;
      case 3:
        return true; // Address is optional
      default:
        return false;
    }
  };

  return (
    <Layout title={t('new.page_title')}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link href="/transactions" className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" />
          {t('back_to_list')}
        </Link>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${step >= s 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div className={`w-12 h-0.5 ${step > s ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400 mb-6">
            {error}
          </div>
        )}

        {/* Step 1: Transaction type */}
        {step === 1 && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {t('new.step1_title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('new.step1_description')}
            </p>

            <div className="grid gap-4">
              {(['purchase', 'sale'] as TransactionType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setTransactionType(type)}
                  className={`
                    p-4 rounded-lg border-2 text-left transition-all
                    ${transactionType === type
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                  `}
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {t(`new.type_${type}`)}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {t(`new.type_${type}_desc`)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Property type */}
        {step === 2 && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {t('new.step2_title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('new.step2_description')}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {PROPERTY_TYPES.map(({ value, icon }) => (
                <button
                  key={value}
                  onClick={() => setPropertyType(value)}
                  className={`
                    p-4 rounded-lg border-2 text-center transition-all
                    ${propertyType === value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                  `}
                >
                  <div className="flex justify-center mb-2 text-gray-600 dark:text-gray-400">
                    {icon}
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {t(`new.property_${value}`)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Property details */}
        {step === 3 && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {t('new.step3_title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('new.step3_description')}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('new.address_label')}
                </label>
                <input
                  type="text"
                  value={propertyAddress}
                  onChange={(e) => setPropertyAddress(e.target.value)}
                  placeholder={t('new.address_placeholder')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('new.neighborhood_label')}
                  </label>
                  <input
                    type="text"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder={t('new.neighborhood_placeholder')}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('new.city_label')}
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={t('new.city_placeholder')}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('new.price_label')}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={listingPrice}
                    onChange={(e) => {
                      // Only allow numbers
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setListingPrice(value);
                    }}
                    placeholder="4500000"
                    className="w-full pl-8 pr-14 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">MXN</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
            className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('new.back')}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('new.next')}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? t('new.creating') : t('new.create')}
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'transactions'])),
    },
  };
};
