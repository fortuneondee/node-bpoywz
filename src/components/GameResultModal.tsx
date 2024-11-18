import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { X } from 'lucide-react';
import { useEffect } from 'react';

interface GameResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: string;
  isWin: boolean;
}

export default function GameResultModal({ isOpen, onClose, result, isWin }: GameResultModalProps) {
  useEffect(() => {
    if (isOpen && isWin) {
      // Create flower-like confetti
      const count = 200;
      const defaults = {
        origin: { y: 0.7 },
        shapes: ['circle'],
        ticks: 500,
      };

      function fire(particleRatio: number, opts: any) {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
        });
      }

      fire(0.25, {
        spread: 26,
        startVelocity: 55,
        colors: ['#ff0000', '#ff69b4', '#ff1493', '#ff69b4']
      });
      fire(0.2, {
        spread: 60,
        colors: ['#00ff00', '#98fb98', '#90ee90', '#32cd32']
      });
      fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8,
        colors: ['#ffd700', '#ffa500', '#ff8c00', '#daa520']
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2,
        colors: ['#ff69b4', '#da70d6', '#ee82ee', '#dda0dd']
      });
    }
  }, [isOpen, isWin]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 perspective-2000">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, rotateX: -90, y: 50 }}
            animate={{ opacity: 1, rotateX: 0, y: 0 }}
            exit={{ opacity: 0, rotateX: 90, y: -50 }}
            transition={{
              type: "spring",
              damping: 20,
              stiffness: 100
            }}
            className={`
              relative w-full max-w-md p-6 rounded-2xl shadow-2xl preserve-3d
              ${isWin 
                ? 'bg-gradient-to-br from-green-400 to-emerald-600' 
                : 'bg-gradient-to-br from-red-400 to-rose-600'
              }
              transform-gpu
            `}
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="mb-4">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className={`
                    inline-flex items-center justify-center w-20 h-20 rounded-full
                    ${isWin ? 'bg-green-300' : 'bg-red-300'}
                    shadow-xl
                  `}
                >
                  <span className="text-4xl">
                    {isWin ? '🎉' : '😔'}
                  </span>
                </motion.div>
              </div>

              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-2xl font-bold text-white mb-4"
              >
                {isWin ? 'Congratulations!' : 'Game Over'}
              </motion.h2>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-white/90 text-lg"
              >
                {result}
              </motion.p>

              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                onClick={onClose}
                className={`
                  mt-6 px-6 py-2 rounded-lg text-sm font-medium
                  ${isWin 
                    ? 'bg-green-300 hover:bg-green-200 text-green-800' 
                    : 'bg-red-300 hover:bg-red-200 text-red-800'
                  }
                  transition-colors shadow-lg
                `}
              >
                Play Again
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}