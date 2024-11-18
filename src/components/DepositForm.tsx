import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { initializePayment } from '../lib/paystack';
import { PlusCircle } from 'lucide-react';

const schema = z.object({
  amount: z.number().min(100, 'Minimum deposit is ₦100'),
});

type FormData = z.infer<typeof schema>;

export default function DepositForm() {
  const { user, updateUserBalance } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    
    setLoading(true);
    try {
      initializePayment(user.email, data.amount, async (reference) => {
        // Create transaction record
        const transactionRef = await addDoc(collection(db, 'transactions'), {
          type: 'deposit',
          amount: data.amount,
          senderId: user.id,
          status: 'completed',
          reference,
          createdAt: serverTimestamp(),
          description: 'Deposit via Paystack',
        });

        // Update user balance
        await updateDoc(doc(db, 'users', user.id), {
          balance: increment(data.amount),
        });

        // Get updated user data
        const userDoc = await getDoc(doc(db, 'users', user.id));
        if (userDoc.exists()) {
          updateUserBalance(userDoc.data().balance);
        }

        toast.success('Deposit successful!');
        reset();
      });
    } catch (error) {
      console.error('Deposit error:', error);
      toast.error('Failed to process deposit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 rounded-lg text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">Add Money</h3>
            <p className="text-sm opacity-90">Deposit funds to your wallet</p>
          </div>
          <PlusCircle className="w-8 h-8 opacity-75" />
        </div>
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
            placeholder="Enter amount"
            disabled={loading}
          />
          {errors.amount && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.amount.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 dark:focus:ring-offset-gray-900"
        >
          {loading ? 'Processing...' : 'Deposit'}
        </button>
      </form>

      <div className="text-sm text-gray-500 dark:text-gray-400">
        <p>💳 Payment Methods:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Card Payment (Instant)</li>
          <li>Bank Transfer (Instant)</li>
          <li>USSD (Instant)</li>
        </ul>
      </div>
    </div>
  );
}