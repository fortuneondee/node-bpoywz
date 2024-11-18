import { Building } from 'lucide-react';
import { useBankTransfer } from './useBankTransfer';

export default function BankTransfer() {
  const {
    form: {
      register,
      handleSubmit,
      formState: { errors },
    },
    banks,
    loading,
    verifying,
    accountName,
    handleTransfer,
  } = useBankTransfer();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-6 rounded-lg text-white">
        <h3 className="text-xl font-bold mb-2">Bank Transfer</h3>
        <p className="text-sm opacity-90">
          Transfer funds directly to any Nigerian bank account
        </p>
      </div>

      <form onSubmit={handleSubmit(handleTransfer)} className="space-y-4">
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
              <option key={bank.code} value={bank.code}>
                {bank.name}
              </option>
            ))}
          </select>
          {errors.bankCode && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.bankCode.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Account Number
          </label>
          <input
            type="text"
            id="accountNumber"
            {...register('accountNumber')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
            placeholder="Enter 10-digit account number"
            disabled={loading}
          />
          {errors.accountNumber && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.accountNumber.message}</p>
          )}
        </div>

        {verifying ? (
          <div className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
            Verifying account...
          </div>
        ) : accountName && (
          <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-md">
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              Account Name: {accountName}
            </p>
          </div>
        )}

        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Amount (₦)
          </label>
          <input
            type="number"
            id="amount"
            {...register('amount', { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
            placeholder="Enter amount"
            disabled={loading || !accountName}
          />
          {errors.amount && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.amount.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description (Optional)
          </label>
          <input
            type="text"
            id="description"
            {...register('description')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
            placeholder="What's this transfer for?"
            disabled={loading || !accountName}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !accountName}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 dark:focus:ring-offset-gray-900"
        >
          {loading ? 'Processing...' : 'Transfer'}
        </button>
      </form>

      <div className="text-sm text-gray-500 dark:text-gray-400">
        <p>💡 Tips:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Ensure account details are correct before proceeding</li>
          <li>Transfers are processed instantly during business hours</li>
          <li>Minimum transfer: ₦100</li>
          <li>Maximum transfer: ₦1,000,000</li>
        </ul>
      </div>
    </div>
  );
}