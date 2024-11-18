import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Transaction } from '../../types';
import { CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function TransactionApproval() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const q = query(
        collection(db, 'transactions'),
        where('status', '==', 'pending'),
        where('type', 'in', ['usdt_deposit', 'usdt_withdrawal']),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      
      const snapshot = await getDocs(q);
      const txData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      
      setTransactions(txData);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (transaction: Transaction, approved: boolean) => {
    try {
      await updateDoc(doc(db, 'transactions', transaction.id), {
        status: approved ? 'completed' : 'cancelled',
        updatedAt: new Date(),
      });
      
      setTransactions(transactions.filter(t => t.id !== transaction.id));
      toast.success(`Transaction ${approved ? 'approved' : 'rejected'} successfully`);
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Failed to update transaction');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Pending Transactions
        </h2>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No pending transactions
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {transactions.map((transaction) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {transaction.type === 'usdt_deposit' ? 'USDT Deposit' : 'USDT Withdrawal'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(transaction.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      ${transaction.usdtAmount?.toFixed(2)} USDT
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      ₦{transaction.amount.toLocaleString()}
                    </p>
                  </div>
                </div>

                {transaction.proofUrl && (
                  <div className="mt-2">
                    <a
                      href={transaction.proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      View Proof
                    </a>
                  </div>
                )}

                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    onClick={() => handleApproval(transaction, true)}
                    className="inline-flex items-center px-3 py-1 rounded-md text-sm text-green-600 hover:text-green-700 dark:text-green-400"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleApproval(transaction, false)}
                    className="inline-flex items-center px-3 py-1 rounded-md text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}