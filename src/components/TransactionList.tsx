import { useState } from 'react';
import { format } from 'date-fns';
import { Transaction } from '../types';
import { ArrowUpRight, ArrowDownLeft, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface TransactionListProps {
  transactions: Transaction[];
  loading: boolean;
}

const INITIAL_DISPLAY_COUNT = 3;

const shimmerItems = Array(3).fill(null);

export default function TransactionList({ transactions, loading }: TransactionListProps) {
  const [showAll, setShowAll] = useState(false);

  if (loading) {
    return (
      <div className="space-y-4">
        {shimmerItems.map((_, index) => (
          <div
            key={index}
            className="h-20 rounded-lg shimmer"
            style={{ animationDelay: `${index * 150}ms` }}
          />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-8 text-gray-500 dark:text-gray-400"
      >
        No transactions yet
      </motion.div>
    );
  }

  const displayedTransactions = showAll 
    ? transactions 
    : transactions.slice(0, INITIAL_DISPLAY_COUNT);

  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="w-5 h-5" />;
      case 'transfer':
        return <ArrowUpRight className="w-5 h-5" />;
    }
  };

  const getTransactionColor = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit':
        return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
      case 'transfer':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const getAmountColor = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit':
        return 'text-green-600 dark:text-green-400';
      case 'transfer':
        return 'text-red-600 dark:text-red-400';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <AnimatePresence mode="popLayout">
        {displayedTransactions.map((transaction, index) => (
          <motion.div
            key={transaction.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2, delay: index * 0.1 }}
            className="group flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center">
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`p-2 rounded-full ${getTransactionColor(transaction.type)} transition-colors duration-200`}
              >
                {getTransactionIcon(transaction.type)}
              </motion.div>
              <div className="ml-4">
                <p className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                  {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {format(transaction.createdAt, 'MMM d, yyyy HH:mm')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {transaction.description}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`font-medium ${getAmountColor(transaction.type)}`}>
                {transaction.type === 'deposit' ? '+' : '-'}
                ₦{transaction.amount.toLocaleString()}
              </p>
              <motion.p
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
                className="text-xs text-gray-500 dark:text-gray-400"
              >
                {transaction.status}
              </motion.p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {transactions.length > INITIAL_DISPLAY_COUNT && (
        <motion.button
          onClick={() => setShowAll(!showAll)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-2 px-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg 
                     text-sm font-medium text-gray-600 dark:text-gray-300 
                     hover:bg-gray-100 dark:hover:bg-gray-700 
                     transition-all duration-200 
                     flex items-center justify-center gap-2
                     hover:shadow-md"
        >
          {showAll ? 'Show Less' : 'View All'}
          <motion.div
            animate={{ rotate: showAll ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </motion.button>
      )}
    </motion.div>
  );
}