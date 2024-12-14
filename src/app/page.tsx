"use client";

import { CreateSessionForm } from "./components/create-session-form";
import { ExistingSessions } from "./components/existing-sessions";
import { Button } from "~/components/ui/button";
import Link from "next/link";
import { Vote, Users, Timer, Lock, Zap, PlusCircle, Search, Presentation } from "lucide-react";
import { motion } from "framer-motion";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Hero Section */}
      <section className="container flex flex-col items-center justify-center gap-8 py-24 text-center">
        <motion.div
          className="mx-auto max-w-3xl"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.h1
            className="text-5xl font-extrabold tracking-tight sm:text-7xl"
            variants={fadeIn}
          >
            Let&apos;s Get This Party Started! 🎉
          </motion.h1>
          <motion.p className="mt-6 text-xl text-muted-foreground" variants={fadeIn}>
            Create a fun award show for your team or friends. Add categories, collect votes, and
            present winners live!
          </motion.p>
          <motion.div
            className="mt-8 flex flex-wrap items-center justify-center gap-4"
            variants={fadeIn}
          >
            <Button asChild size="lg" className="h-12 px-8">
              <Link href="#get-started">
                Create Award Show <PlusCircle className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-8">
              <Link href="#get-started">
                Access Existing Show <Search className="h-5 w-5" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="border-t bg-muted/50">
        <div className="container py-24">
          <motion.h2
            className="text-center text-3xl font-bold sm:text-4xl"
            initial="hidden"
            whileInView="visible"
            variants={fadeIn}
            viewport={{ once: true }}
          >
            Simple & Fun Award Shows
          </motion.h2>
          <motion.div
            className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            whileInView="visible"
            variants={stagger}
            viewport={{ once: true }}
          >
            <FeatureCard
              icon={Users}
              title="Perfect for Any Group"
              description="Teams, friends, family gatherings - make your event special!"
            />
            <FeatureCard
              icon={Vote}
              title="Easy Voting"
              description="Everyone can vote from their phone - no app needed."
            />
            <FeatureCard
              icon={Presentation}
              title="Live Presentation"
              description="Show winners on the big screen with our presentation mode."
            />
            <FeatureCard
              icon={Zap}
              title="Quick Setup"
              description="Ready in 2 minutes - just add your categories and start."
            />
            <FeatureCard
              icon={Lock}
              title="Optional Password"
              description="Keep the management page private if you want to."
            />
            <FeatureCard
              icon={Timer}
              title="Real-time Updates"
              description="See votes come in live as people make their choice."
            />
          </motion.div>
        </div>
      </section>

      {/* Get Started Section */}
      <section id="get-started" className="border-t">
        <div className="container py-24">
          <motion.div
            className="mx-auto max-w-3xl"
            initial="hidden"
            whileInView="visible"
            variants={stagger}
            viewport={{ once: true }}
          >
            <motion.h2 className="text-center text-3xl font-bold sm:text-4xl" variants={fadeIn}>
              Get Started
            </motion.h2>
            <motion.p className="mt-4 text-center text-muted-foreground" variants={fadeIn}>
              Create a new award show or access an existing one
            </motion.p>
            <motion.div className="mt-12 grid gap-8 sm:grid-cols-2" variants={fadeIn}>
              <CreateSessionForm />
              <ExistingSessions />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="border-t bg-muted/50">
        <div className="container py-24">
          <motion.h2
            className="text-center text-3xl font-bold sm:text-4xl"
            initial="hidden"
            whileInView="visible"
            variants={fadeIn}
            viewport={{ once: true }}
          >
            How It Works
          </motion.h2>
          <motion.div
            className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            whileInView="visible"
            variants={stagger}
            viewport={{ once: true }}
          >
            <StepCard
              number="1"
              title="Create Your Show"
              description="Give your award show a name - that's all you need to start!"
            />
            <StepCard
              number="2"
              title="Add Categories"
              description="Add fun award categories and nominations for people to vote on."
            />
            <StepCard
              number="3"
              title="Present & Vote"
              description="Share the link, collect votes, and present winners on the big screen."
            />
          </motion.div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <motion.div className="rounded-lg border bg-card p-6" variants={fadeIn}>
      <Icon className="h-12 w-12 text-primary" />
      <h3 className="mt-4 text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-muted-foreground">{description}</p>
    </motion.div>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <motion.div className="rounded-lg border bg-card p-6" variants={fadeIn}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
        {number}
      </div>
      <h3 className="mt-4 text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-muted-foreground">{description}</p>
    </motion.div>
  );
}
