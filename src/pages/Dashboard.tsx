import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Transaction } from '../types';
import TransactionList from '../components/TransactionList';
import DepositForm from '../components/DepositForm';
import TransferForm from '../components/TransferForm';
import NumberGame from '../components/NumberGame';
import LuckyNumbers from '../components/LuckyNumbers';
import UsdtBalance from '../components/UsdtBalance';
import EmailVerification from '../components/EmailVerification';
import { Wallet, ArrowLeftRight, PlusCircle, Gamepad2, DollarSign } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'deposit' | 'transfer' | 'game' | 'usdt'>('deposit');
  const [activeGame, setActiveGame] = useState<'number' | 'lucky'>('number');

  useEffect(() => {
    loadTransactions();
  }, [user]);

  const loadTransactions = async () => {
    if (!user) return;
    
    try {
      const q = query(
        collection(db, 'transactions'),
        where('senderId', '==', user.id)
      );
      
      const querySnapshot = await getDocs(q);
      const txs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate()
      })) as Transaction[];
      
      txs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      setTransactions(txs);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EmailVerification />
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Welcome back,</p>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{user.username}</h1>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-right">
                <p className="text-gray-500 dark:text-gray-400">Available Balance</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ₦{user.balance.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-gray-500 dark:text-gray-400">USDT Balance</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ${user.usdtBalance?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex space-x-4 mb-6 overflow-x-auto">
              <button
                onClick={() => setActiveTab('deposit')}
                className={`flex items-center px-4 py-2 rounded-md whitespace-nowrap ${
                  activeTab === 'deposit'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                <PlusCircle className="w-5 h-5 mr-2" />
                Deposit
              </button>
              <button
                onClick={() => setActiveTab('transfer')}
                className={`flex items-center px-4 py-2 rounded-md whitespace-nowrap ${
                  activeTab === 'transfer'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                <ArrowLeftRight className="w-5 h-5 mr-2" />
                Transfer
              </button>
              <button
                onClick={() => setActiveTab('game')}
                className={`flex items-center px-4 py-2 rounded-md whitespace-nowrap ${
                  activeTab === 'game'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                <Gamepad2 className="w-5 h-5 mr-2" />
                Games
              </button>
              <button
                onClick={() => setActiveTab('usdt')}
                className={`flex items-center px-4 py-2 rounded-md whitespace-nowrap ${
                  activeTab === 'usdt'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                <DollarSign className="w-5 h-5 mr-2" />
                USDT
              </button>
            </div>

            {activeTab === 'deposit' && <DepositForm />}
            {activeTab === 'transfer' && <TransferForm />}
            {activeTab === 'game' && (
              <div className="space-y-6">
                <div className="flex space-x-4 mb-6">
                  <button
                    onClick={() => setActiveGame('number')}
                    className={`flex-1 py-2 px-4 rounded-md ${
                      activeGame === 'number'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    Number Game
                  </button>
                  <button
                    onClick={() => setActiveGame('lucky')}
                    className={`flex-1 py-2 px-4 rounded-md ${
                      activeGame === 'lucky'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    Lucky Numbers
                  </button>
                </div>
                {activeGame === 'number' ? <NumberGame /> : <LuckyNumbers />}
              </div>
            )}
            {activeTab === 'usdt' && <UsdtBalance />}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Recent Transactions
            </h2>
            <TransactionList transactions={transactions} loading={loading} />
          </div>
        </div>
      </div>
    </div>
  );
}