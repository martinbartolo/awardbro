"use client";

import { useEffect } from "react";

import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";

import { type CategoryType } from "~/generated/prisma/enums";
import { getScoreLabel } from "~/lib/utils";

import { NominationDescription } from "./nomination-description";

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
  isWinner,
  isTied,
  categoryType = "NORMAL",
  hideVoteCounts = false,
}: {
  nomination: Nomination;
  index: number;
  isWinner: boolean;
  isTied: boolean;
  categoryType?: CategoryType;
  hideVoteCounts?: boolean;
}) {
  const scoreLabel = getScoreLabel(categoryType, nomination._count.votes);
  useEffect(() => {
    let burstInterval: NodeJS.Timeout | undefined;
    let animationFrame: number | undefined;

    if (isWinner && (!isTied || index === 0)) {
      // Initial burst
      const count = 200;
      const defaults = {
        origin: { y: 0.7 },
      };

      function fire(particleRatio: number, opts: confetti.Options) {
        void confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
        });
      }

      fire(0.25, {
        spread: 26,
        startVelocity: 55,
        colors: ["#FFD700", "#FDB931"],
      });
      fire(0.2, {
        spread: 60,
        colors: ["#ff0000", "#00ff00", "#0000ff"],
      });
      fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8,
        colors: ["#ffffff", "#FFD700"],
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2,
        colors: ["#ff0000", "#00ff00", "#0000ff"],
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 45,
        colors: ["#FFD700", "#FDB931"],
      });

      // Continuous side shots
      const duration = 8 * 1000;
      const end = Date.now() + duration;

      function frame() {
        void confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ["#FFD700", "#FDB931", "#ff0000", "#00ff00"],
        });
        void confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ["#FFD700", "#FDB931", "#0000ff", "#ff00ff"],
        });

        if (Date.now() < end) {
          animationFrame = requestAnimationFrame(frame);
        }
      }
      frame();

      // Random bursts during the duration
      const burstEnd = Date.now() + duration;
      burstInterval = setInterval(() => {
        if (Date.now() > burstEnd) {
          clearInterval(burstInterval);
          return;
        }

        void confetti({
          particleCount: 50,
          angle: 90,
          spread: 70,
          origin: { y: 0.7, x: Math.random() },
          colors: [
            "#FFD700",
            "#FDB931",
            "#ff0000",
            "#00ff00",
            "#0000ff",
            "#ff00ff",
          ],
          startVelocity: 30,
          gravity: 1.2,
          drift: Math.random() - 0.5,
        });
      }, 1000);
    }

    // Cleanup function
    return () => {
      if (burstInterval) clearInterval(burstInterval);
      if (animationFrame) cancelAnimationFrame(animationFrame);
      confetti.reset();
    };
  }, [index, isWinner, isTied]);

  const variants = {
    hidden: {
      opacity: 0,
      scale: 0.5,
      y: 100,
      rotate: -10,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      rotate: 0,
      transition: {
        type: "spring" as const,
        stiffness: 200,
        damping: 15,
        delay: index * 0.3,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.5,
      y: -100,
      transition: {
        duration: 0.2,
      },
    },
  };

  const medalColors = {
    winner:
      "bg-gradient-to-br from-yellow-300 to-yellow-500 border-yellow-400 shadow-lg shadow-yellow-500/50 text-shadow-medal",
    second:
      "bg-gradient-to-br from-gray-200 to-gray-400 border-gray-300 shadow-lg shadow-gray-400/50 text-shadow-medal",
    third:
      "bg-gradient-to-br from-orange-300 to-orange-600 border-orange-400 shadow-lg shadow-orange-500/50 text-shadow-medal",
    other: "bg-chart-4 border-chart-4/50 shadow-lg shadow-chart-4/30",
  };

  const descriptionVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.5,
        delay: index * 0.3 + 0.7,
      },
    },
    exit: {
      opacity: 0,
      x: -50,
      transition: {
        duration: 0.2,
      },
    },
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={variants}
        className={`rounded-xl border-2 p-6 backdrop-blur-xs ${isWinner ? "p-8" : ""} ${
          isWinner
            ? medalColors.winner
            : index === 1
              ? medalColors.second
              : index === 2
                ? medalColors.third
                : medalColors.other
        }`}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            {isWinner && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ delay: index * 0.3 + 0.6 }}
                className="bg-background/20 text-background mb-2 inline-block rounded-full px-4 py-1 text-sm font-bold"
              >
                🏆 {isTied ? "Tied Winner" : "Winner"}
              </motion.div>
            )}
            <motion.h3
              className={`${
                isWinner ? "text-3xl md:text-4xl" : "text-xl md:text-2xl"
              } text-background font-extrabold`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.3 + 0.3 }}
            >
              {nomination.name}
            </motion.h3>
            {nomination.description && (
              <motion.div variants={descriptionVariants}>
                <NominationDescription
                  description={nomination.description}
                  className={`mt-2 ${isWinner ? "text-base" : "text-sm"} text-background/80`}
                />
              </motion.div>
            )}
          </div>
          <AnimatePresence mode="wait">
            {!hideVoteCounts && (
              <motion.div
                key="vote-counts"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                }}
                className="flex items-center gap-2"
              >
                <motion.span
                  className={`${
                    isWinner ? "text-3xl md:text-4xl" : "text-xl md:text-2xl"
                  } text-background font-black whitespace-nowrap`}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    repeatDelay: 2,
                    ease: "easeInOut",
                  }}
                >
                  {nomination._count.votes}
                </motion.span>
                <span className="text-background font-semibold">
                  {scoreLabel}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
