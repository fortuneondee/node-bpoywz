import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PAYSTACK_SECRET_KEY = import.meta.env.VITE_PAYSTACK_SECRET_KEY;

const schema = z.object({
  bankCode: z.string().min(1, 'Please select a bank'),
  accountNumber: z.string().length(10, 'Account number must be 10 digits'),
  amount: z.number()
    .min(1000, 'Minimum withdrawal is ₦1,000')
    .max(1000000, 'Maximum withdrawal is ₦1,000,000'),
});

type FormData = z.infer<typeof schema>;

interface Bank {
  id: number;
  name: string;
  code: string;
}

interface PayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PayoutModal({ isOpen, onClose }: PayoutModalProps) {
  const { user, updateUserBalance } = useAuth();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [accountName, setAccountName] = useState('');

  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const accountNumber = watch('accountNumber');
  const bankCode = watch('bankCode');

  useEffect(() => {
    if (isOpen) {
      fetchBanks();
    }
  }, [isOpen]);

  const fetchBanks = async () => {
    try {
      const response = await fetch('https://api.paystack.co/bank', {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      });
      const data = await response.json();
      if (data.status) {
        setBanks(data.data.sort((a: Bank, b: Bank) => a.name.localeCompare(b.name)));
      }
    } catch (error) {
      console.error('Error fetching banks:', error);
      toast.error('Failed to load banks');
    }
  };

  const verifyAccount = async () => {
    if (!accountNumber || !bankCode || accountNumber.length !== 10) return;
    
    setVerifying(true);
    setAccountName('');
    
    try {
      const response = await fetch(
        `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
        }
      );
      const data = await response.json();
      if (data.status) {
        setAccountName(data.data.account_name);
        toast.success('Account verified!');
      } else {
        throw new Error('Invalid account details');
      }
    } catch (error) {
      console.error('Error verifying account:', error);
      toast.error('Failed to verify account');
      setAccountName('');
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (accountNumber?.length === 10 && bankCode) {
      verifyAccount();
    }
  }, [accountNumber, bankCode]);

  const onSubmit = async (data: FormData) => {
    if (!user || loading || !accountName) return;

    setLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', user.id);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists()) {
          throw new Error('User not found');
        }

        const currentBalance = userDoc.data().balance;
        if (currentBalance < data.amount) {
          throw new Error('Insufficient balance');
        }

        // Create payout request
        const payoutRef = doc(collection(db, 'payouts'));
        transaction.set(payoutRef, {
          userId: user.id,
          amount: data.amount,
          bankName: banks.find(b => b.code === data.bankCode)?.name,
          bankCode: data.bankCode,
          accountNumber: data.accountNumber,
          accountName,
          status: 'pending',
          createdAt: serverTimestamp(),
        });

        // Create transaction record
        const transactionRef = doc(collection(db, 'transactions'));
        transaction.set(transactionRef, {
          type: 'payout',
          amount: data.amount,
          senderId: user.id,
          status: 'pending',
          createdAt: serverTimestamp(),
          description: 'Payout Request',
        });

        // Update user balance
        transaction.update(userRef, {
          balance: increment(-data.amount),
        });

        // Update local balance
        updateUserBalance(currentBalance - data.amount);
      });

      toast.success('Payout request submitted successfully!');
      reset();
      onClose();
    } catch (error: any) {
      console.error('Payout error:', error);
      toast.error(error.message || 'Failed to submit payout request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl"
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                Request Payout
              </h2>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label htmlFor="bankCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Select Bank
                  </label>
                  <select
                    id="bankCode"
                    {...register('bankCode')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                    placeholder="Enter account number"
                    disabled={loading}
                  />
                  {errors.accountNumber && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.accountNumber.message}</p>
                  )}
                </div>

                {verifying ? (
                  <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying account...</span>
                  </div>
                ) : accountName && (
                  <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded text-green-700 dark:text-green-300 text-sm">
                    Account Name: {accountName}
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                    placeholder="Enter amount"
                    disabled={loading || !accountName}
                  />
                  {errors.amount && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.amount.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !accountName}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Request Payout'}
                </button>
              </form>

              <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                <p>Note: Payouts are processed within 24 hours</p>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}