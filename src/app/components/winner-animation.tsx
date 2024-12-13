'use client';

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import confetti from 'canvas-confetti';

type Nomination = {
    _count: {
        votes: number;
    };
    description: string | null;
    name: string;
    id: string;
    categoryId: string;
    createdAt: Date;
    updatedAt: Date;
};

export function WinnerAnimation({
  nomination,
  index,
}: {
  nomination: Nomination;
  index: number;
}) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
    if (index === 0) {
      // Initial burst
      const count = 200;
      const defaults = {
        origin: { y: 0.7 }
      };

      function fire(particleRatio: number, opts: confetti.Options) {
        void confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio)
        });
      }

      fire(0.25, {
        spread: 26,
        startVelocity: 55,
        colors: ['#FFD700', '#FDB931']
      });
      fire(0.2, {
        spread: 60,
        colors: ['#ff0000', '#00ff00', '#0000ff']
      });
      fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8,
        colors: ['#ffffff', '#FFD700']
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2,
        colors: ['#ff0000', '#00ff00', '#0000ff']
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 45,
        colors: ['#FFD700', '#FDB931']
      });

      // Continuous side shots
      const duration = 8 * 1000;
      const end = Date.now() + duration;

      (function frame() {
        void confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#FFD700', '#FDB931', '#ff0000', '#00ff00'],
        });
        void confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#FFD700', '#FDB931', '#0000ff', '#ff00ff'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }());

      // Random bursts during the duration
      const burstEnd = Date.now() + duration;
      const burstInterval = setInterval(() => {
        if (Date.now() > burstEnd) {
          clearInterval(burstInterval);
          return;
        }

        void confetti({
          particleCount: 50,
          angle: 90,
          spread: 70,
          origin: { y: 0.7, x: Math.random() },
          colors: ['#FFD700', '#FDB931', '#ff0000', '#00ff00', '#0000ff', '#ff00ff'],
          startVelocity: 30,
          gravity: 1.2,
          drift: Math.random() - 0.5,
        });
      }, 1000);

      // Cleanup
      return () => clearInterval(burstInterval);
    }
  }, [index]);

  const variants = {
    hidden: { 
      opacity: 0,
      scale: 0.5,
      y: 100,
      rotate: -10
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      rotate: 0,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 15,
        delay: index * 0.3,
      }
    }
  };

  const medalColors = {
    0: "bg-gradient-to-br from-yellow-300 to-yellow-500 border-yellow-400 shadow-lg shadow-yellow-500/50 text-shadow-medal",
    1: "bg-gradient-to-br from-gray-200 to-gray-400 border-gray-300 shadow-lg shadow-gray-400/50 text-shadow-medal",
    2: "bg-gradient-to-br from-orange-300 to-orange-600 border-orange-400 shadow-lg shadow-orange-500/50 text-shadow-medal"
  };

  const votesVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: {
      scale: 1,
      rotate: 0,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay: (index * 0.3) + 0.5,
      }
    }
  };

  const descriptionVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.5,
        delay: (index * 0.3) + 0.7,
      }
    }
  };

  return (
    <AnimatePresence>
      {isAnimating && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={variants}
          className={`rounded-xl p-6 border-2 backdrop-blur-sm ${
            medalColors[index as keyof typeof medalColors] ?? "bg-gradient-to-br from-purple-400 to-purple-600 border-purple-500 shadow-lg shadow-purple-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <motion.h3 
              className="text-2xl font-extrabold text-white [text-shadow:_0_1px_3px_rgb(0_0_0_/_40%)]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (index * 0.3) + 0.3 }}
            >
              {nomination.name}
            </motion.h3>
            <motion.div
              variants={votesVariants}
              className="flex items-center gap-2"
            >
              <motion.span
                className="text-2xl font-black text-white [text-shadow:_0_1px_3px_rgb(0_0_0_/_40%)]"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ 
                  duration: 0.5,
                  repeat: Infinity,
                  repeatDelay: 2
                }}
              >
                {nomination._count.votes}
              </motion.span>
              <span className="text-white font-semibold [text-shadow:_0_1px_2px_rgb(0_0_0_/_40%)]">votes</span>
            </motion.div>
          </div>
          {nomination.description && (
            <motion.p
              variants={descriptionVariants}
              className="mt-3 text-white font-medium [text-shadow:_0_1px_2px_rgb(0_0_0_/_30%)]"
            >
              {nomination.description}
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
} 