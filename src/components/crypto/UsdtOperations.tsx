import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Upload, Download, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';

const schema = z.object({
  amount: z.number()
    .min(10, 'Minimum amount is $10')
    .max(10000, 'Maximum amount is $10,000'),
  proofUrl: z.string().url('Please enter a valid URL').optional(),
});

type FormData = z.infer<typeof schema>;

export default function UsdtOperations() {
  const { user, updateUserBalance } = useAuth();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Create transaction record
      const transactionRef = await addDoc(collection(db, 'transactions'), {
        type: mode === 'deposit' ? 'usdt_deposit' : 'usdt_withdrawal',
        amount: data.amount * 1700, // Convert to NGN using current rate
        usdtAmount: data.amount,
        senderId: user.id,
        status: 'pending',
        proofUrl: data.proofUrl,
        createdAt: serverTimestamp(),
        description: `USDT ${mode === 'deposit' ? 'Deposit' : 'Withdrawal'}`,
      });

      toast.success(`${mode === 'deposit' ? 'Deposit' : 'Withdrawal'} request submitted successfully`);
      reset();
    } catch (error) {
      console.error('Transaction error:', error);
      toast.error(`Failed to process ${mode}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6 rounded-lg text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">USDT Operations</h3>
            <p className="text-sm opacity-90">Deposit or withdraw USDT</p>
          </div>
          <DollarSign className="w-8 h-8 opacity-75" />
        </div>
      </div>

      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setMode('deposit')}
          className={`flex items-center px-4 py-2 rounded-md ${
            mode === 'deposit'
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}
        >
          <Upload className="w-5 h-5 mr-2" />
          Deposit
        </button>
        <button
          onClick={() => setMode('withdraw')}
          className={`flex items-center px-4 py-2 rounded-md ${
            mode === 'withdraw'
              ? 'bg-red-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}
        >
          <Download className="w-5 h-5 mr-2" />
          Withdraw
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Amount (USDT)
          </label>
          <input
            type="number"
            id="amount"
            {...register('amount', { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
            placeholder="Enter amount"
            disabled={loading}
          />
          {errors.amount && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.amount.message}</p>
          )}
        </div>

        {mode === 'deposit' && (
          <div>
            <label htmlFor="proofUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Payment Proof URL
            </label>
            <input
              type="url"
              id="proofUrl"
              {...register('proofUrl')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
              placeholder="Enter proof URL"
              disabled={loading}
            />
            {errors.proofUrl && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.proofUrl.message}</p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            mode === 'deposit'
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-red-600 hover:bg-red-700'
          } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50`}
        >
          {loading ? 'Processing...' : mode === 'deposit' ? 'Submit Deposit' : 'Request Withdrawal'}
        </button>
      </form>

      <div className="text-sm text-gray-500 dark:text-gray-400">
        <p>💡 Tips:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Minimum transaction: $10</li>
          <li>Maximum transaction: $10,000</li>
          <li>Processing time: 10-30 minutes</li>
          <li>Keep proof of payment for reference</li>
        </ul>
      </div>
    </div>
  );
}