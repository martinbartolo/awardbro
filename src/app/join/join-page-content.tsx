"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "~/components/ui/button";

import { ExistingSessions } from "../components/existing-sessions";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function JoinPageContent() {
  return (
    <main className="bg-background text-foreground flex min-h-screen w-full flex-col items-center justify-center px-4 py-12">
      <motion.div
        className="w-full max-w-md"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
      >
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </Button>

        <h1 className="mb-2 text-3xl font-bold">Access Award Show</h1>
        <p className="text-muted-foreground mb-8">
          Enter the URL of an existing award show to vote or manage
        </p>

        <ExistingSessions />
      </motion.div>
    </main>
  );
}
