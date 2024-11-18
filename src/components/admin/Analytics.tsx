import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Transaction } from '../../types';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

interface VolumeData {
  date: string;
  volume: number;
  deposits: number;
  withdrawals: number;
}

export default function Analytics() {
  const [volumeData, setVolumeData] = useState<VolumeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({
    volume: 0,
    deposits: 0,
    withdrawals: 0
  });

  useEffect(() => {
    loadVolumeData();
  }, []);

  const loadVolumeData = async () => {
    try {
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);

      const q = query(
        collection(db, 'transactions'),
        where('type', 'in', ['usdt_deposit', 'usdt_withdrawal']),
        where('status', '==', 'completed'),
        where('createdAt', '>=', last30Days)
      );

      const snapshot = await getDocs(q);
      const transactions = snapshot.docs.map(doc => ({
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate()
      })) as Transaction[];

      // Group transactions by date
      const groupedData = transactions.reduce((acc, tx) => {
        const date = tx.createdAt.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = {
            date,
            volume: 0,
            deposits: 0,
            withdrawals: 0
          };
        }
        const amount = tx.usdtAmount || 0;
        acc[date].volume += amount;
        if (tx.type === 'usdt_deposit') {
          acc[date].deposits += amount;
        } else {
          acc[date].withdrawals += amount;
        }
        return acc;
      }, {} as Record<string, VolumeData>);

      // Convert to array and sort by date
      const chartData = Object.values(groupedData).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Calculate totals
      const totalVolume = chartData.reduce((acc, day) => acc + day.volume, 0);
      const totalDeposits = chartData.reduce((acc, day) => acc + day.deposits, 0);
      const totalWithdrawals = chartData.reduce((acc, day) => acc + day.withdrawals, 0);

      setVolumeData(chartData);
      setTotals({
        volume: totalVolume,
        deposits: totalDeposits,
        withdrawals: totalWithdrawals
      });
    } catch (error) {
      console.error('Error loading volume data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Volume</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${totals.volume.toFixed(2)}
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Deposits</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                ${totals.deposits.toFixed(2)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Withdrawals</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                ${totals.withdrawals.toFixed(2)}
              </p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-500" />
          </div>
        </motion.div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Daily Transaction Volume
        </h3>
        <div className="h-64 flex items-center justify-center">
          {volumeData.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No transaction data available</p>
          ) : (
            <div className="w-full h-full">
              {/* Simple volume visualization */}
              <div className="flex h-full items-end space-x-2">
                {volumeData.map((day) => (
                  <div
                    key={day.date}
                    className="flex-1 bg-blue-100 dark:bg-blue-900/30 rounded-t relative group"
                    style={{
                      height: `${(day.volume / totals.volume) * 100}%`,
                      minHeight: '4px'
                    }}
                  >
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      ${day.volume.toFixed(2)} on {new Date(day.date).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}