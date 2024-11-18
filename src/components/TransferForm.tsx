import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { 
  doc, 
  updateDoc, 
  increment, 
  collection, 
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  runTransaction,
  getDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeftRight } from 'lucide-react';

const schema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  amount: z.number()
    .min(100, 'Minimum transfer is ₦100')
    .max(1000000, 'Maximum transfer is ₦1,000,000'),
  description: z.string().min(3, 'Description is required'),
});

type FormData = z.infer<typeof schema>;

export default function TransferForm() {
  const { user, updateUserBalance } = useAuth();
  const [loading, setLoading] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  
  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const username = watch('username');

  // Verify recipient exists when username changes
  const verifyRecipient = async (username: string) => {
    if (!username || username.length < 3) {
      setRecipientName('');
      return;
    }

    try {
      const q = query(
        collection(db, 'users'),
        where('username', '==', username)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const recipientData = querySnapshot.docs[0].data();
        setRecipientName(recipientData.username);
      } else {
        setRecipientName('');
      }
    } catch (error) {
      console.error('Error verifying recipient:', error);
      setRecipientName('');
    }
  };

  // Watch for username changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (username) {
        verifyRecipient(username);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Find recipient by username
      const recipientQuery = query(
        collection(db, 'users'),
        where('username', '==', data.username)
      );
      const recipientDocs = await getDocs(recipientQuery);
      
      if (recipientDocs.empty) {
        toast.error('Recipient not found');
        return;
      }

      const recipient = recipientDocs.docs[0];

      if (recipient.id === user.id) {
        toast.error('Cannot transfer to yourself');
        return;
      }

      // Use transaction to ensure atomicity
      await runTransaction(db, async (transaction) => {
        // Get sender's current data
        const senderRef = doc(db, 'users', user.id);
        const senderDoc = await transaction.get(senderRef);
        
        if (!senderDoc.exists()) {
          throw new Error('Sender account not found');
        }

        const currentBalance = senderDoc.data().balance;
        if (currentBalance < data.amount) {
          throw new Error('Insufficient balance');
        }

        // Get recipient's current data
        const recipientRef = doc(db, 'users', recipient.id);
        const recipientDoc = await transaction.get(recipientRef);
        
        if (!recipientDoc.exists()) {
          throw new Error('Recipient account not found');
        }

        // Create transaction record
        const transactionRef = doc(collection(db, 'transactions'));
        transaction.set(transactionRef, {
          type: 'transfer',
          amount: data.amount,
          senderId: user.id,
          recipientId: recipient.id,
          status: 'completed',
          createdAt: serverTimestamp(),
          description: data.description,
        });

        // Update sender's balance
        transaction.update(senderRef, {
          balance: increment(-data.amount),
        });

        // Update recipient's balance
        transaction.update(recipientRef, {
          balance: increment(data.amount),
        });
      });

      // Get updated user data
      const userDoc = await getDoc(doc(db, 'users', user.id));
      if (userDoc.exists()) {
        updateUserBalance(userDoc.data().balance);
      }

      toast.success('Transfer successful!');
      reset();
      setRecipientName('');
    } catch (error: any) {
      console.error('Transfer error:', error);
      if (error.message === 'Insufficient balance') {
        toast.error('Insufficient balance');
      } else {
        toast.error('Failed to process transfer');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-6 rounded-lg text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">Send Money</h3>
            <p className="text-sm opacity-90">Transfer to other users instantly</p>
          </div>
          <ArrowLeftRight className="w-8 h-8 opacity-75" />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Recipient Username
          </label>
          <input
            type="text"
            id="username"
            {...register('username')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
            placeholder="Enter recipient's username"
            disabled={loading}
          />
          {errors.username && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.username.message}</p>
          )}
          {recipientName && (
            <p className="mt-1 text-sm text-green-600 dark:text-green-400">
              Sending to: {recipientName}
            </p>
          )}
        </div>

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
            disabled={loading || !recipientName}
          />
          {errors.amount && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.amount.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
          </label>
          <input
            type="text"
            id="description"
            {...register('description')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
            placeholder="What's this transfer for?"
            disabled={loading || !recipientName}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !recipientName}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 dark:focus:ring-offset-gray-900"
        >
          {loading ? 'Processing...' : 'Send Money'}
        </button>
      </form>

      <div className="text-sm text-gray-500 dark:text-gray-400">
        <p>💡 Tips:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Double-check the recipient's username before sending</li>
          <li>Transfers are instant and cannot be reversed</li>
          <li>Minimum transfer: ₦100</li>
          <li>Maximum transfer: ₦1,000,000</li>
        </ul>
      </div>
    </div>
  );
}