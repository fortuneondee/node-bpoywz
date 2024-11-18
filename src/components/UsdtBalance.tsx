import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';

const schema = z.object({
  amount: z.number()
    .min(1000, 'Minimum amount is ₦1,000')
    .max(1000000, 'Maximum amount is ₦1,000,000'),
});

type FormData = z.infer<typeof schema>;

const USDT_RATE = {
  buy: 1700, // ₦1700 per USDT when buying
  sell: 1550, // ₦1550 per USDT when selling
};

export default function UsdtBalance() {
  const { user, updateUserBalance } = useAuth();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const processTransaction = async (data: FormData) => {
    if (!user) return;

    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', user.id);
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists()) {
          throw new Error('User not found');
        }

        const currentBalance = userDoc.data().balance;
        const currentUsdtBalance = userDoc.data().usdtBalance || 0;
        const rate = mode === 'buy' ? USDT_RATE.buy : USDT_RATE.sell;
        const usdtAmount = mode === 'buy' 
          ? data.amount / rate 
          : data.amount / rate;

        if (mode === 'buy') {
          if (currentBalance < data.amount) {
            throw new Error('Insufficient balance');
          }
        } else {
          if (currentUsdtBalance < usdtAmount) {
            throw new Error('Insufficient USDT balance');
          }
        }

        // Create transaction record
        const transactionRef = doc(collection(db, 'transactions'));
        transaction.set(transactionRef, {
          type: mode === 'buy' ? 'buy_usdt' : 'sell_usdt',
          amount: data.amount,
          usdtAmount,
          rate,
          senderId: user.id,
          status: 'completed',
          createdAt: serverTimestamp(),
          description: mode === 'buy' 
            ? `Bought ${usdtAmount.toFixed(2)} USDT` 
            : `Sold ${usdtAmount.toFixed(2)} USDT`,
        });

        // Update balances
        transaction.update(userRef, {
          balance: increment(mode === 'buy' ? -data.amount : data.amount),
          usdtBalance: increment(mode === 'buy' ? usdtAmount : -usdtAmount),
        });
      });

      // Get updated user data
      const updatedUserDoc = await getDoc(doc(db, 'users', user.id));
      if (updatedUserDoc.exists()) {
        updateUserBalance(updatedUserDoc.data().balance);
      }

      toast.success(mode === 'buy' ? 'USDT purchased successfully!' : 'USDT sold successfully!');
      reset();
    } catch (error: any) {
      console.error('USDT transaction error:', error);
      toast.error(error.message || 'Transaction failed');
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!user || loading) return;
    setLoading(true);
    try {
      await processTransaction(data);
    } finally {
      setLoading(false);
    }
  };

  const rate = mode === 'buy' ? USDT_RATE.buy : USDT_RATE.sell;
  const estimatedUsdt = (amount: number) => (amount / rate).toFixed(2);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-green-500 to-teal-500 p-6 rounded-lg text-white">
        <h3 className="text-xl font-bold mb-4">USDT Balance</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm opacity-90">Available USDT</p>
            <p className="text-2xl font-bold">${user?.usdtBalance?.toFixed(2) || '0.00'}</p>
          </div>
          <div>
            <p className="text-sm opacity-90">Rate</p>
            <p className="text-lg">₦{rate.toLocaleString()}/USDT</p>
          </div>
        </div>
      </div>

      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setMode('buy')}
          className={`flex items-center px-4 py-2 rounded-md ${
            mode === 'buy'
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}
        >
          <ArrowDownLeft className="w-5 h-5 mr-2" />
          Buy USDT
        </button>
        <button
          onClick={() => setMode('sell')}
          className={`flex items-center px-4 py-2 rounded-md ${
            mode === 'sell'
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}
        >
          <ArrowUpRight className="w-5 h-5 mr-2" />
          Sell USDT
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Amount (₦)
          </label>
          <input
            type="number"
            id="amount"
            {...register('amount', { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
            placeholder="Enter amount in Naira"
            disabled={loading}
          />
          {errors.amount && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.amount.message}</p>
          )}
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Estimated {mode === 'buy' ? 'USDT to receive' : 'NGN to receive'}:
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {mode === 'buy' ? '$' : '₦'}
            {estimatedUsdt(Number(register('amount').value) || 0)}
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 dark:focus:ring-offset-gray-900"
        >
          {loading ? 'Processing...' : mode === 'buy' ? 'Buy USDT' : 'Sell USDT'}
        </button>
      </form>

      <div className="text-sm text-gray-500 dark:text-gray-400">
        <p>💡 Tips:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Buy USDT at ₦{USDT_RATE.buy}/USDT</li>
          <li>Sell USDT at ₦{USDT_RATE.sell}/USDT</li>
          <li>Minimum transaction: ₦1,000</li>
          <li>Maximum transaction: ₦1,000,000</li>
        </ul>
      </div>
    </div>
  );
}