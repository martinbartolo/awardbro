"use client";

import { motion } from "framer-motion";

import { Badge } from "~/components/ui/badge";

type SourceCategory = {
  id: string;
  name: string;
};

type AggregateInfoProps = {
  sourceCategories: SourceCategory[];
};

export function AggregateInfo({ sourceCategories }: AggregateInfoProps) {
  return (
    <motion.div
      className="py-8 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.p
        className="text-muted-foreground mb-8 text-xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        Combining results from
      </motion.p>

      <motion.div
        className="mb-10 flex flex-wrap items-center justify-center gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {sourceCategories.map((category, index) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              delay: 0.5 + index * 0.15,
              type: "spring",
              stiffness: 200,
              damping: 15,
            }}
          >
            <Badge
              variant="secondary"
              className="px-5 py-2.5 text-lg font-medium"
            >
              {category.name}
            </Badge>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, duration: 0.4 }}
      >
        <motion.p
          className="text-3xl font-bold"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          And the winner is...
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
