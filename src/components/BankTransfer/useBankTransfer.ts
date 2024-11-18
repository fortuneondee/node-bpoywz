import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { doc, increment, collection, serverTimestamp, runTransaction, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';

interface Bank {
  id: number;
  name: string;
  code: string;
}

const schema = z.object({
  accountNumber: z.string().length(10, 'Account number must be 10 digits'),
  bankCode: z.string().min(1, 'Please select a bank'),
  amount: z.number()
    .min(100, 'Minimum transfer is ₦100')
    .max(1000000, 'Maximum transfer is ₦1,000,000'),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const PAYSTACK_SECRET_KEY = import.meta.env.VITE_PAYSTACK_SECRET_KEY;

export function useBankTransfer() {
  const { user, updateUserBalance } = useAuth();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [accountName, setAccountName] = useState('');

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const { watch, setValue } = form;
  const accountNumber = watch('accountNumber');
  const bankCode = watch('bankCode');

  const fetchBanks = async () => {
    try {
      const response = await fetch('https://api.paystack.co/bank', {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      });
      const data = await response.json();
      if (data.status) {
        const sortedBanks = data.data.sort((a: Bank, b: Bank) => 
          a.name.localeCompare(b.name)
        );
        setBanks(sortedBanks);
      } else {
        throw new Error(data.message || 'Failed to fetch banks');
      }
    } catch (error) {
      console.error('Error fetching banks:', error);
      toast.error('Failed to load banks. Please refresh the page.');
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
        toast.success('Account verified successfully');
      } else {
        throw new Error(data.message || 'Invalid account details');
      }
    } catch (error: any) {
      console.error('Error verifying account:', error);
      toast.error(error.message || 'Failed to verify account');
      setAccountName('');
    } finally {
      setVerifying(false);
    }
  };

  const createTransferRecipient = async (data: FormData) => {
    const response = await fetch('https://api.paystack.co/transferrecipient', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'nuban',
        name: accountName,
        account_number: data.accountNumber,
        bank_code: data.bankCode,
        currency: 'NGN',
      }),
    });
    const result = await response.json();
    if (!result.status) throw new Error(result.message || 'Failed to create transfer recipient');
    return result.data.recipient_code;
  };

  const initiateTransfer = async (recipientCode: string, data: FormData) => {
    const response = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: data.amount * 100,
        recipient: recipientCode,
        reason: data.description || 'Bank Transfer',
      }),
    });
    const result = await response.json();
    if (!result.status) throw new Error(result.message || 'Failed to initiate transfer');
    return result.data.transfer_code;
  };

  const handleTransfer = async (data: FormData) => {
    if (!user || loading || !accountName) return;

    setLoading(true);
    try {
      const recipientCode = await createTransferRecipient(data);
      const transferCode = await initiateTransfer(recipientCode, data);

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

        const transactionRef = doc(collection(db, 'transactions'));
        transaction.set(transactionRef, {
          type: 'bank_transfer',
          amount: data.amount,
          senderId: user.id,
          recipientName: accountName,
          recipientAccount: data.accountNumber,
          recipientBank: banks.find(b => b.code === data.bankCode)?.name,
          status: 'pending',
          transferCode,
          createdAt: serverTimestamp(),
          description: data.description || 'Bank Transfer',
        });

        transaction.update(userRef, {
          balance: increment(-data.amount),
        });
      });

      const userDoc = await getDoc(doc(db, 'users', user.id));
      if (userDoc.exists()) {
        updateUserBalance(userDoc.data().balance);
      }

      toast.success('Transfer initiated successfully!');
      resetForm();
    } catch (error: any) {
      console.error('Transfer error:', error);
      toast.error(error.message || 'Failed to process transfer');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setValue('accountNumber', '');
    setValue('bankCode', '');
    setValue('amount', 0);
    setValue('description', '');
    setAccountName('');
  };

  useEffect(() => {
    fetchBanks();
  }, []);

  useEffect(() => {
    if (accountNumber?.length === 10 && bankCode) {
      verifyAccount();
    }
  }, [accountNumber, bankCode]);

  return {
    form,
    banks,
    loading,
    verifying,
    accountName,
    handleTransfer,
  };
}