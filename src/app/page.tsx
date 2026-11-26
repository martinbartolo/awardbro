"use client";

import { useState } from "react";

import {
  CirclePlus,
  CircleQuestionMark,
  Heart,
  Lock,
  Presentation,
  Timer,
  Users,
  Vote,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";

import { RoomCodeForm } from "~/app/components/room-code-form";
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
  const [isManaging, setIsManaging] = useState(false);

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
              Support
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
            id="join"
            className="mx-auto mt-8 w-full max-w-md scroll-mt-24 px-4 text-left"
            variants={fadeIn}
          >
            <p className="mb-2 text-sm font-medium">
              At a show? Enter the room code from the big screen
            </p>
            <RoomCodeForm page="vote" label="Room code from the big screen" />
          </motion.div>
          <motion.div
            className="mx-auto mt-8 flex w-full max-w-md flex-col items-center gap-3 px-4"
            variants={fadeIn}
          >
            <p className="text-muted-foreground text-sm">Hosting a show?</p>
            <Button asChild size="lg" variant="outline" className="h-12 px-8">
              <Link href="/create">
                Create Award Show <CirclePlus className="h-5 w-5" />
              </Link>
            </Button>
            {isManaging ? (
              <div className="w-full text-left">
                <p className="text-muted-foreground mb-2 text-sm">
                  Enter your show&apos;s room code to manage it
                </p>
                <RoomCodeForm
                  page="manage"
                  label="Your show's room code"
                  focusOnMount
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsManaging(true)}
                className="text-muted-foreground hover:text-primary text-sm underline underline-offset-4 transition-colors"
              >
                Already hosting? Manage your show
              </button>
            )}
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
              title="Host Controls"
              description="Run the show from your own manage page, kept to you with a password."
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
              description="Give your award show a name and a password, and get a room code for your guests."
            />
            <StepCard
              number="2"
              title="Customize Categories"
              description="Add your award categories and nominations for people to vote on."
            />
            <StepCard
              number="3"
              title="Go Live"
              description="Put the big screen up: guests scan the QR code or enter the room code, and you reveal the winners."
            />
          </motion.div>
          <motion.div
            className="mt-10 flex justify-center sm:mt-12"
            initial="hidden"
            whileInView="visible"
            variants={fadeIn}
            viewport={{ once: true }}
          >
            <Button asChild variant="outline" size="lg">
              <Link href="/help">
                <CircleQuestionMark className="h-5 w-5" />
                Read the Full Guide
              </Link>
            </Button>
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
                href="/help"
                className="text-muted-foreground hover:text-primary text-sm transition-colors"
              >
                Help
              </Link>
              <a
                href="https://ko-fi.com/1martin"
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
