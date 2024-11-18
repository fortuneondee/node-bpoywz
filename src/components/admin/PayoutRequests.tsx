import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, updateDoc, doc, runTransaction } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface PayoutRequest {
  id: string;
  userId: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: 'pending' | 'completed' | 'rejected';
  createdAt: Date;
}

export default function PayoutRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const q = query(
        collection(db, 'payouts'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const payoutData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      })) as PayoutRequest[];
      
      setRequests(payoutData);
    } catch (error) {
      console.error('Error loading payout requests:', error);
      toast.error('Failed to load payout requests');
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (request: PayoutRequest, approved: boolean) => {
    try {
      await runTransaction(db, async (transaction) => {
        // Update payout request status
        const payoutRef = doc(db, 'payouts', request.id);
        transaction.update(payoutRef, {
          status: approved ? 'completed' : 'rejected',
          processedBy: user?.id,
          processedAt: new Date(),
        });

        // Update related transaction
        const txQuery = query(
          collection(db, 'transactions'),
          where('senderId', '==', request.userId),
          where('type', '==', 'payout'),
          where('status', '==', 'pending')
        );
        const txSnapshot = await getDocs(txQuery);
        
        txSnapshot.docs.forEach(doc => {
          transaction.update(doc.ref, {
            status: approved ? 'completed' : 'cancelled',
          });
        });

        // If rejected, refund the amount
        if (!approved) {
          const userRef = doc(db, 'users', request.userId);
          transaction.update(userRef, {
            balance: increment(request.amount),
          });
        }
      });

      setRequests(requests.filter(r => r.id !== request.id));
      toast.success(`Payout request ${approved ? 'approved' : 'rejected'}`);
    } catch (error) {
      console.error('Error processing payout request:', error);
      toast.error('Failed to process request');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Payout Requests
        </h2>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No pending payout requests
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {requests.map((request) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Amount: ₦{request.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Requested: {request.createdAt.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    <span className="text-sm text-yellow-500">Pending</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Bank Details</p>
                    <p className="font-medium text-gray-900 dark:text-white">{request.bankName}</p>
                    <p className="text-gray-600 dark:text-gray-300">{request.accountNumber}</p>
                    <p className="text-gray-600 dark:text-gray-300">{request.accountName}</p>
                  </div>
                </div>

                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    onClick={() => handleRequest(request, true)}
                    className="inline-flex items-center px-3 py-1 rounded-md text-sm text-green-600 hover:text-green-700 dark:text-green-400"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleRequest(request, false)}
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