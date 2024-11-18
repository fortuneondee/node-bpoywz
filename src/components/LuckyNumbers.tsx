import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { doc, increment, collection, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GameResultModal from './GameResultModal';

// Processing Modal Component
const ProcessingModal = ({ isOpen }: { isOpen: boolean }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl flex flex-col items-center space-y-4"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="w-12 h-12 text-purple-500" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg font-medium text-gray-900 dark:text-white"
            >
              Processing Your Game
            </motion.div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 7, ease: "linear" }}
              className="h-1 bg-purple-500 rounded-full"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const schema = z.object({
  stake: z.number()
    .min(100, 'Minimum stake is ₦100')
    .max(10000000, 'Maximum stake is ₦10,000,000'),
});

type FormData = z.infer<typeof schema>;

export default function LuckyNumbers() {
  const { user, updateUserBalance } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [winningNumbers, setWinningNumbers] = useState<number[]>([]);
  const [gameResult, setGameResult] = useState<string>('');
  const [showResult, setShowResult] = useState(false);
  const [showProcessing, setShowProcessing] = useState(false);
  const [gameInProgress, setGameInProgress] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isWin, setIsWin] = useState(false);
  const [soundInitialized, setSoundInitialized] = useState(false);
  const [displayNumbers, setDisplayNumbers] = useState<number[]>([]);

  // Initialize random display numbers
  useEffect(() => {
    const generateRandomNumbers = () => {
      const numbers = new Set<number>();
      while (numbers.size < 15) {
        numbers.add(Math.floor(Math.random() * 99) + 1);
      }
      return Array.from(numbers);
    };
    setDisplayNumbers(generateRandomNumbers());
  }, []);

  const clickSoundUrl = '/sounds/click.mp3';
  const winSoundUrl = '/sounds/win.mp3';
  const loseSoundUrl = '/sounds/lose.mp3';
  const backgroundMusicUrl = '/sounds/background.mp3';

  const clickSound = useRef<HTMLAudioElement | null>(null);
  const winSound = useRef<HTMLAudioElement | null>(null);
  const loseSound = useRef<HTMLAudioElement | null>(null);
  const backgroundMusic = useRef<HTMLAudioElement | null>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    clickSound.current = new Audio(clickSoundUrl);
    winSound.current = new Audio(winSoundUrl);
    loseSound.current = new Audio(loseSoundUrl);
    backgroundMusic.current = new Audio(backgroundMusicUrl);

    if (backgroundMusic.current) {
      backgroundMusic.current.loop = true;
      backgroundMusic.current.volume = 0.3;
    }

    return () => {
      if (backgroundMusic.current) {
        backgroundMusic.current.pause();
        backgroundMusic.current.currentTime = 0;
      }
    };
  }, []);

  useEffect(() => {
    const handleInteraction = () => {
      if (!soundInitialized && backgroundMusic.current) {
        setSoundInitialized(true);
        if (!isMuted) {
          const playPromise = backgroundMusic.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.error("Audio play failed:", error);
            });
          }
        }
      }
    };

    window.addEventListener('click', handleInteraction, { once: true });
    return () => window.removeEventListener('click', handleInteraction);
  }, [soundInitialized, isMuted]);

  const playSound = async (sound: HTMLAudioElement | null) => {
    if (sound && !isMuted) {
      sound.currentTime = 0;
      try {
        await sound.play();
      } catch (error) {
        console.error("Error playing sound:", error);
      }
    }
  };

  const toggleSound = () => {
    setIsMuted(prev => {
      if (backgroundMusic.current) {
        if (prev) {
          backgroundMusic.current.play().catch(console.error);
        } else {
          backgroundMusic.current.pause();
        }
      }
      return !prev;
    });
  };

  const handleNumberClick = (number: number) => {
    if (gameInProgress) return;
    
    playSound(clickSound.current);

    if (selectedNumbers.includes(number)) {
      setSelectedNumbers(selectedNumbers.filter(n => n !== number));
    } else if (selectedNumbers.length < 4) {
      setSelectedNumbers([...selectedNumbers, number]);
    }
  };

  const generateWinningNumbers = () => {
    // Generate winning numbers from the available display numbers
    const availableNumbers = [...displayNumbers];
    const numbers: number[] = [];
    while (numbers.length < 4) {
      const randomIndex = Math.floor(Math.random() * availableNumbers.length);
      numbers.push(availableNumbers[randomIndex]);
      availableNumbers.splice(randomIndex, 1);
    }
    return numbers;
  };

  const calculateWinnings = (matches: number, stake: number) => {
    switch (matches) {
      case 4: return stake * 4;
      case 3: return stake * 1;
      case 2: return stake * 0.5;
      default: return 0;
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!user || loading || selectedNumbers.length !== 4) return;

    setLoading(true);
    setGameInProgress(true);
    setShowProcessing(true);

    try {
      const winning = generateWinningNumbers();
      const matches = selectedNumbers.filter((num) => winning.includes(num)).length;
      const winAmount = calculateWinnings(matches, data.stake);
      const hasWon = winAmount > 0;

      await new Promise(resolve => setTimeout(resolve, 7000));

      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', user.id);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists()) {
          throw new Error('User not found');
        }

        const currentBalance = userDoc.data().balance;
        if (currentBalance < data.stake) {
          throw new Error('Insufficient balance');
        }

        const transactionRef = doc(collection(db, 'transactions'));
        transaction.set(transactionRef, {
          type: 'game',
          amount: hasWon ? winAmount + data.stake : -data.stake,
          senderId: user.id,
          status: hasWon ? 'won' : 'lost',
          createdAt: serverTimestamp(),
          description: hasWon ? `Won ₦${winAmount}` : 'Lost the game',
        });

        const balanceChange = hasWon ? winAmount + data.stake : -data.stake;
        transaction.update(userRef, {
          balance: increment(balanceChange),
        });

        updateUserBalance(currentBalance + balanceChange);
      });

      setWinningNumbers(winning);
      setIsWin(hasWon);

      if (hasWon) {
        playSound(winSound.current);
        setGameResult(`You matched ${matches} numbers and won ₦${(winAmount + data.stake).toLocaleString()}!`);
      } else {
        playSound(loseSound.current);
        setGameResult('No matches! Better luck next time!');
      }

      setShowProcessing(false);
      setShowResult(true);
    } catch (error: any) {
      console.error('Game error:', error);
      toast.error(error.message || 'Failed to process game');
      setShowProcessing(false);
    } finally {
      setLoading(false);
    }
  };

  const resetGame = () => {
    setSelectedNumbers([]);
    setWinningNumbers([]);
    setGameResult('');
    setShowResult(false);
    setGameInProgress(false);
    // Generate new random numbers for the next game
    const generateRandomNumbers = () => {
      const numbers = new Set<number>();
      while (numbers.size < 15) {
        numbers.add(Math.floor(Math.random() * 99) + 1);
      }
      return Array.from(numbers);
    };
    setDisplayNumbers(generateRandomNumbers());
    reset();
    playSound(clickSound.current);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 p-8 rounded-lg text-white relative overflow-hidden shadow-xl transform hover:scale-[1.02] transition-transform duration-300">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-20 h-20 bg-white rounded-full mix-blend-overlay animate-float"></div>
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-white rounded-full mix-blend-overlay animate-float-delayed"></div>
        </div>

        {/* Sound control button */}
        <div className="absolute top-4 right-4">
          <button 
            onClick={toggleSound} 
            className="p-2 hover:bg-white/10 rounded-full transition-colors backdrop-blur-sm"
          >
            {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </button>
        </div>

        {/* Main content */}
        <div className="relative z-10 space-y-4">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🎲</span>
            <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-100 [text-shadow:_2px_2px_2px_rgb(0_0_0_/_20%)]">
              Lucky Numbers
            </h3>
            <span className="text-2xl">✨</span>
          </div>
          
          <div className="flex items-center space-x-2 text-sm">
            <span className="animate-pulse">🎯</span>
            <p className="opacity-90 font-medium">
              Pick 4 numbers and match them to win big prizes!
            </p>
          </div>

          <div className="flex gap-3 text-sm">
            <span className="px-3 py-1 bg-white/10 rounded-full backdrop-blur-sm">
              Win up to 400%
            </span>
            <span className="px-3 py-1 bg-white/10 rounded-full backdrop-blur-sm animate-bounce">
              Instant Rewards
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
        }
      `}</style>

      <div className="grid grid-cols-5 gap-3">
        {displayNumbers.map((number) => (
          <motion.button
            key={number}
            onClick={() => handleNumberClick(number)}
            disabled={gameInProgress || (selectedNumbers.length === 4 && !selectedNumbers.includes(number))}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              relative aspect-square rounded-lg text-xl font-bold
              flex items-center justify-center
              transition-all duration-200
              shadow-lg transform hover:translate-y-[-2px]
              before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br
              ${selectedNumbers.includes(number)
                ? 'before:from-purple-600 before:to-purple-800 text-white'
                : 'before:from-gray-100 before:to-gray-300 dark:before:from-gray-700 dark:before:to-gray-900 text-gray-900 dark:text-white'
              }
              ${gameInProgress && winningNumbers.includes(number)
                ? 'ring-4 ring-green-500 dark:ring-green-400'
                : ''
              }
              disabled:opacity-50 disabled:cursor-not-allowed
              [transform-style:preserve-3d] hover:[transform:rotateX(10deg)]
            `}
          >
            <span className="relative z-10">
              {number}
            </span>
            <span className={`absolute -top-2 -right-2 w-6 h-6 rounded-full text-xs flex items-center justify-center z-20 transition-all duration-300
              ${selectedNumbers.includes(number)
                ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-[0_0_10px_rgba(251,191,36,0.5)] animate-pulse'
                : 'bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700'
              }`}>
              👑
            </span>
          </motion.button>
        ))}
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
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
            placeholder="Enter stake amount"
            disabled={loading || gameInProgress}
          />
          {errors.stake && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.stake.message}</p>
          )}
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading || gameInProgress || selectedNumbers.length !== 4}
            className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 dark:focus:ring-offset-gray-900"
          >
            {loading ? 'Processing...' : 'Play Game'}
          </button>

          {gameInProgress && (
            <button
              type="button"
              onClick={resetGame}
              className="flex-1 py-2 px-4 border border-purple-600 rounded-md shadow-sm text-sm font-medium text-purple-600 bg-transparent hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:text-purple-400 dark:border-purple-400 dark:hover:bg-purple-900/20 dark:focus:ring-offset-gray-900"
            >
              Play Again
            </button>
          )}
        </div>
      </form>

      <ProcessingModal isOpen={showProcessing} />
      <GameResultModal isOpen={showResult} onClose={resetGame} result={gameResult} isWin={isWin} />

      <div className="text-sm text-gray-500 dark:text-gray-400">
        <p>🎮 How to play:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Select 4 numbers from 1-15</li>
          <li>Enter your stake amount (₦100 - ₦10,000,000)</li>
          <li>Match 2 numbers: Win 50% of stake</li>
          <li>Match 3 numbers: Win 100% of stake</li>
          <li>Match all 4: Win 400% of stake (Jackpot!)</li>
        </ul>
      </div>
    </div>
  );
}