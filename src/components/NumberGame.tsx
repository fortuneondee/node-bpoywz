import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

const schema = z.object({
  stake: z.number()
    .min(100, 'Minimum stake is ₦100')
    .max(10000, 'Maximum stake is ₦10,000'),
  guess: z.number()
    .min(1, 'Guess must be between 1 and 3')
    .max(3, 'Guess must be between 1 and 3'),
});

type FormData = z.infer<typeof schema>;

export default function NumberGame() {
  const { user, updateUserBalance } = useAuth();
  const [loading, setLoading] = useState(false);
  const [targetNumber, setTargetNumber] = useState<number>(0);
  const [gameOver, setGameOver] = useState(false);
  const [feedback, setFeedback] = useState<string>('');

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      stake: 100,
      guess: 1,
    },
  });

  useEffect(() => {
    startNewGame();
  }, []);

  const startNewGame = () => {
    setTargetNumber(Math.floor(Math.random() * 3) + 1);
    setGameOver(false);
    setFeedback('');
    reset();
  };

  const processGameResult = async (data: FormData, won: boolean, newFeedback: string) => {
    if (!user) return;

    try {
      const balanceChange = won ? data.stake * 2 : -data.stake; // Double the stake on win

      await runTransaction(db, async (transaction) => {
        // Get fresh user data
        const userRef = doc(db, 'users', user.id);
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists()) {
          throw new Error('User not found');
        }

        const currentBalance = userDoc.data().balance;
        if (currentBalance < data.stake) {
          throw new Error('Insufficient balance');
        }

        // Create transaction record
        const transactionRef = doc(collection(db, 'transactions'));
        transaction.set(transactionRef, {
          type: 'game',
          amount: Math.abs(balanceChange),
          senderId: user.id,
          status: 'completed',
          createdAt: serverTimestamp(),
          description: won ? 'Won Number Game' : 'Lost Number Game',
        });

        // Update user balance
        transaction.update(userRef, {
          balance: increment(balanceChange),
        });
      });

      // Get updated user data
      const updatedUserDoc = await getDoc(doc(db, 'users', user.id));
      if (updatedUserDoc.exists()) {
        updateUserBalance(updatedUserDoc.data().balance);
      }

      setFeedback(newFeedback);
      setGameOver(true);
      toast(won ? '🎉 You won!' : '😔 Game Over');
    } catch (error: any) {
      console.error('Game error:', error);
      toast.error(error.message || 'Failed to process game');
      return false;
    }
    return true;
  };

  const onSubmit = async (data: FormData) => {
    if (!user || loading) return;
    
    if (user.balance < data.stake) {
      toast.error('Insufficient balance');
      return;
    }

    setLoading(true);
    try {
      const won = data.guess === targetNumber;
      const newFeedback = won
        ? '🎉 Congratulations! You won double your stake!'
        : `Game Over! The number was ${targetNumber}`;

      await processGameResult(data, won, newFeedback);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6 rounded-lg text-white">
        <h3 className="text-xl font-bold mb-2">Number Guessing Game</h3>
        <p className="text-sm opacity-90">
          Guess a number between 1 and 3. Win double your stake if you guess correctly!
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="stake" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Stake Amount (₦)
          </label>
          <input
            type="number"
            id="stake"
            {...register('stake', { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
            placeholder="Enter stake amount"
            disabled={loading || gameOver}
          />
          {errors.stake && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.stake.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="guess" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Your Guess
          </label>
          <input
            type="number"
            id="guess"
            {...register('guess', { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
            placeholder="Enter your guess"
            disabled={loading || gameOver}
          />
          {errors.guess && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.guess.message}</p>
          )}
        </div>

        {feedback && (
          <div className={`p-4 rounded-md ${
            feedback.includes('Congratulations')
              ? 'bg-green-100 text-green-700 dark:bg-green-800/30 dark:text-green-300'
              : 'bg-red-100 text-red-700 dark:bg-red-800/30 dark:text-red-300'
          } animate-slide-in`}>
            {feedback}
          </div>
        )}

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading || gameOver}
            className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 dark:focus:ring-offset-gray-900"
          >
            {loading ? 'Processing...' : 'Submit Guess'}
          </button>

          {gameOver && (
            <button
              type="button"
              onClick={startNewGame}
              className="flex-1 py-2 px-4 border border-blue-600 rounded-md shadow-sm text-sm font-medium text-blue-600 bg-transparent hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:text-blue-400 dark:border-blue-400 dark:hover:bg-blue-900/20 dark:focus:ring-offset-gray-900"
            >
              Play Again
            </button>
          )}
        </div>
      </form>

      <div className="text-sm text-gray-500 dark:text-gray-400 space-y-2">
        <p>🎮 How to play:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Enter your stake amount (₦100 - ₦10,000)</li>
          <li>Guess a number between 1 and 3</li>
          <li>You have one attempt to guess correctly</li>
          <li>Win double your stake if you guess correctly!</li>
        </ul>
      </div>
    </div>
  );
}