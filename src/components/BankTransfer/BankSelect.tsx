import { Bank } from './types';

interface BankSelectProps {
  banks: Bank[];
  loading: boolean;
  register: any;
  error?: string;
}

export default function BankSelect({ banks, loading, register, error }: BankSelectProps) {
  return (
    <div>
      <label htmlFor="bankCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Select Bank
      </label>
      <select
        id="bankCode"
        {...register('bankCode')}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
        disabled={loading}
      >
        <option value="">Select a bank</option>
        {banks.map((bank) => (
          <option key={`${bank.id}-${bank.code}`} value={bank.code}>
            {bank.name}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}