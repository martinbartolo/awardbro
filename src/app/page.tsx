"use client";

import { motion } from "framer-motion";
import {
  Heart,
  Lock,
  PlusCircle,
  Presentation,
  Search,
  Timer,
  Users,
  Vote,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { AnimatedCounter } from "~/components/ui/animated-counter";
import { Button } from "~/components/ui/button";

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
    <main className="bg-background text-foreground flex min-h-screen w-full flex-col items-center justify-start">
      {/* Header */}
      <header className="bg-background/80 fixed top-0 z-50 w-full border-b backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <span className="text-lg font-bold">🎉AwardBro</span>
          <Button asChild variant="outline" size="sm">
            <a
              href="https://ko-fi.com/1martin"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Support</span>
            </a>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex min-h-screen w-full items-center justify-center px-4 pt-14">
        <motion.div
          className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-8 text-center"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div
            className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
            variants={fadeIn}
          >
            <span className="relative flex h-2 w-2">
              <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
              <span className="bg-primary relative inline-flex h-2 w-2 rounded-full"></span>
            </span>
            <AnimatedCounter target={250} suffix="+" /> award shows hosted
          </motion.div>
          <motion.h1
            className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
            variants={fadeIn}
          >
            Let&apos;s Get This Party Started! 🎉
          </motion.h1>
          <motion.p
            className="text-muted-foreground mt-4 px-4 text-lg sm:text-xl"
            variants={fadeIn}
          >
            Create a real-time interactive award show for your team or friends.
            Add categories, collect votes, and present winners live!
          </motion.p>
          <motion.div
            className="mt-8 flex flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-center"
            variants={fadeIn}
          >
            <Button asChild size="lg" className="h-12 px-8">
              <Link href="/create">
                Create Award Show <PlusCircle className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-8">
              <Link href="/join">
                Access Existing Show <Search className="h-5 w-5" />
              </Link>
            </Button>
          </motion.div>
          <motion.p
            className="text-muted-foreground mt-4 text-sm"
            variants={fadeIn}
          >
            Free to use • No sign-up required
          </motion.p>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="bg-muted/50 w-full border-t">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-24">
          <motion.h2
            className="text-center text-2xl font-bold sm:text-3xl lg:text-4xl"
            initial="hidden"
            whileInView="visible"
            variants={fadeIn}
            viewport={{ once: true }}
          >
            Simple & Fun Award Shows
          </motion.h2>
          <motion.div
            className="mt-8 grid gap-6 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            whileInView="visible"
            variants={stagger}
            viewport={{ once: true }}
          >
            <FeatureCard
              icon={Users}
              title="Perfect for Any Group"
              description="Host award shows for company events, team celebrations, or social gatherings with unlimited participants."
            />
            <FeatureCard
              icon={Vote}
              title="Easy Voting"
              description="Participants vote instantly from any device - no registration required."
            />
            <FeatureCard
              icon={Presentation}
              title="Live Presentations"
              description="Dynamic big-screen display with live vote tracking and winner reveals."
            />
            <FeatureCard
              icon={Zap}
              title="Quick Setup"
              description="Ready in 2 minutes - just add your categories and start."
            />
            <FeatureCard
              icon={Lock}
              title="Secure Management"
              description="Control your event with a private management dashboard."
            />
            <FeatureCard
              icon={Timer}
              title="Real-time Updates"
              description="See votes come in live as people make their choice."
            />
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="w-full border-t">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-24">
          <motion.h2
            className="text-center text-2xl font-bold sm:text-3xl lg:text-4xl"
            initial="hidden"
            whileInView="visible"
            variants={fadeIn}
            viewport={{ once: true }}
          >
            How It Works
          </motion.h2>
          <motion.div
            className="mt-8 grid gap-6 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            whileInView="visible"
            variants={stagger}
            viewport={{ once: true }}
          >
            <StepCard
              number="1"
              title="Create Your Event"
              description="Set up your award show with a custom name and optional password protection."
            />
            <StepCard
              number="2"
              title="Customize Categories"
              description="Add your award categories and nominations for people to vote on."
            />
            <StepCard
              number="3"
              title="Go Live"
              description="Share the voting link, watch the votes roll in, and present winners on the big screen."
            />
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/50 w-full border-t">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="flex flex-col items-center justify-center text-center">
            <h3 className="text-xl font-semibold">AwardBro</h3>
            <p className="text-muted-foreground mt-4 max-w-md">
              Create interactive award shows with live voting and real-time
              results. Perfect for team events, celebrations, and social
              gatherings.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-6">
              <Link
                href="/create"
                className="text-muted-foreground hover:text-primary text-sm transition-colors"
              >
                Create Show
              </Link>
              <Link
                href="/join"
                className="text-muted-foreground hover:text-primary text-sm transition-colors"
              >
                Access Show
              </Link>
              <a
                href="https://ko-fi.com/martinbartolo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground text-sm transition-colors hover:text-pink-500"
              >
                Support ❤️
              </a>
              <a
                href="https://github.com/martinbartolo/awardbro/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary text-sm transition-colors"
              >
                Report a Bug
              </a>
            </div>
            <div className="mt-8 w-full border-t pt-8 text-center">
              <p className="text-muted-foreground text-sm">
                © {new Date().getFullYear()} AwardBro. Created by{" "}
                <a
                  href="https://martinbartolo.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Martin Bartolo
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>
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
    <motion.div className="bg-card rounded-lg border p-6" variants={fadeIn}>
      <Icon className="text-primary h-12 w-12" />
      <h3 className="mt-4 text-xl font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-2">{description}</p>
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
    <motion.div className="bg-card rounded-lg border p-6" variants={fadeIn}>
      <div className="bg-primary text-primary-foreground flex h-12 w-12 items-center justify-center rounded-full text-2xl font-bold">
        {number}
      </div>
      <h3 className="mt-4 text-xl font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-2">{description}</p>
    </motion.div>
  );
}
