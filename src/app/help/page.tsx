"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  FolderPlus,
  Link2,
  ListPlus,
  Monitor,
  MousePointerClick,
  Play,
  Settings,
  Share2,
  Sparkles,
  Trophy,
  Users,
  Vote,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

export default function HelpPage() {
  return (
    <main className="bg-background text-foreground min-h-screen">
      {/* Header */}
      <header className="bg-background/80 sticky top-0 z-50 border-b backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Button asChild variant="ghost" size="sm" className="shrink-0">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Home</span>
            </Link>
          </Button>
          <span className="truncate px-2 text-base font-bold sm:text-lg">
            🎉 AwardBro Help
          </span>
          <div className="hidden w-24 sm:block" />
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-12">
        {/* Hero Section */}
        <motion.div
          className="mb-16 text-center"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div
            className="bg-primary/10 text-primary mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
            variants={fadeIn}
          >
            <Sparkles className="h-4 w-4" />
            Complete Guide
          </motion.div>
          <motion.h1
            className="mb-4 text-4xl font-extrabold tracking-tight sm:text-5xl"
            variants={fadeIn}
          >
            How to Use AwardBro
          </motion.h1>
          <motion.p
            className="text-muted-foreground mx-auto max-w-2xl text-lg"
            variants={fadeIn}
          >
            Everything you need to know to create, manage, and present your
            award show. Follow these simple steps to get started!
          </motion.p>
        </motion.div>

        {/* Quick Navigation */}
        <motion.div
          className="mb-16 grid gap-4 sm:grid-cols-3"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.a
            href="#create"
            className="bg-card hover:border-primary group rounded-xl border p-6 transition-all"
            variants={fadeIn}
          >
            <FolderPlus className="text-primary mb-3 h-8 w-8" />
            <h3 className="font-semibold">1. Create Show</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Set up your award show
            </p>
          </motion.a>
          <motion.a
            href="#manage"
            className="bg-card hover:border-accent group rounded-xl border p-6 transition-all"
            variants={fadeIn}
          >
            <Settings className="text-accent mb-3 h-8 w-8" />
            <h3 className="font-semibold">2. Manage Voting</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Control categories & votes
            </p>
          </motion.a>
          <motion.a
            href="#present"
            className="bg-card group rounded-xl border p-6 transition-all hover:border-orange-500"
            variants={fadeIn}
          >
            <Monitor className="mb-3 h-8 w-8 text-orange-500" />
            <h3 className="font-semibold">3. Present Winners</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Reveal winners live
            </p>
          </motion.a>
        </motion.div>

        {/* Section 1: Creating an Award Show */}
        <motion.section
          id="create"
          className="mb-20 scroll-mt-20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div className="mb-8" variants={fadeIn}>
            <Badge className="bg-primary/20 text-primary mb-4 border-0">
              Step 1
            </Badge>
            <h2 className="mb-2 text-3xl font-bold">
              Creating Your Award Show
            </h2>
            <p className="text-muted-foreground max-w-2xl">
              Setting up your award show takes less than 2 minutes. Here&apos;s
              how to get started.
            </p>
          </motion.div>

          <div className="space-y-6">
            <motion.div variants={fadeIn}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="bg-primary/20 text-primary flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold">
                      1
                    </div>
                    Go to Create Page
                  </CardTitle>
                  <CardDescription>
                    Click &quot;Create Award Show&quot; on the homepage or
                    navigate to{" "}
                    <code className="bg-muted rounded px-1.5 py-0.5">
                      /create
                    </code>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-secondary flex items-center gap-3 rounded-lg p-4">
                    <Link2 className="text-primary h-5 w-5" />
                    <span className="text-sm">
                      Tip: Bookmark this page for easy access when creating
                      future shows
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeIn}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="bg-primary/20 text-primary flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold">
                      2
                    </div>
                    Enter Show Details
                  </CardTitle>
                  <CardDescription>
                    Fill in the basic information for your award show
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="bg-secondary rounded-lg p-4">
                      <h4 className="mb-2 font-medium">Show Name</h4>
                      <p className="text-muted-foreground text-sm">
                        Choose a memorable name like &quot;2024 Team
                        Awards&quot; or &quot;Best of the Year&quot;
                      </p>
                    </div>
                    <div className="bg-secondary rounded-lg p-4">
                      <h4 className="mb-2 font-medium">
                        Password{" "}
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Optional
                        </Badge>
                      </h4>
                      <p className="text-muted-foreground text-sm">
                        Add a password to protect your manage page. Recommended
                        if you want to restrict who can edit categories.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeIn}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="bg-primary/20 text-primary flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold">
                      3
                    </div>
                    Save Your Links
                  </CardTitle>
                  <CardDescription>
                    After creation, you&apos;ll receive important links
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="bg-secondary flex items-start gap-3 rounded-lg p-4">
                      <Vote className="text-primary mt-0.5 h-5 w-5 shrink-0" />
                      <div>
                        <h4 className="font-medium">Vote Link</h4>
                        <p className="text-muted-foreground mt-1 text-xs">
                          Share with participants to let them vote
                        </p>
                      </div>
                    </div>
                    <div className="bg-secondary flex items-start gap-3 rounded-lg p-4">
                      <Settings className="text-accent mt-0.5 h-5 w-5 shrink-0" />
                      <div>
                        <h4 className="font-medium">Manage Link</h4>
                        <p className="text-muted-foreground mt-1 text-xs">
                          Admin access to control your show
                        </p>
                      </div>
                    </div>
                    <div className="bg-secondary flex items-start gap-3 rounded-lg p-4">
                      <Monitor className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
                      <div>
                        <h4 className="font-medium">Present Link</h4>
                        <p className="text-muted-foreground mt-1 text-xs">
                          Display on big screen for reveals
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.section>

        {/* Section 2: Managing Voting */}
        <motion.section
          id="manage"
          className="mb-20 scroll-mt-20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div className="mb-8" variants={fadeIn}>
            <Badge className="bg-accent/20 text-accent mb-4 border-0">
              Step 2
            </Badge>
            <h2 className="mb-2 text-3xl font-bold">
              Managing Your Award Show
            </h2>
            <p className="text-muted-foreground max-w-2xl">
              The manage page is your control center. Here you can add
              categories, nominations, and control the voting flow.
            </p>
          </motion.div>

          <div className="space-y-6">
            <motion.div variants={fadeIn}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <ListPlus className="text-accent h-6 w-6" />
                    Adding Categories
                  </CardTitle>
                  <CardDescription>
                    Categories are the award types people will vote on
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-secondary rounded-lg p-4">
                    <h4 className="mb-3 font-medium">Category Examples:</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Best Team Player</Badge>
                      <Badge variant="outline">Most Creative</Badge>
                      <Badge variant="outline">Rising Star</Badge>
                      <Badge variant="outline">Best Presentation</Badge>
                      <Badge variant="outline">Most Helpful</Badge>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border p-4">
                    <CheckCircle2 className="text-accent mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <h4 className="font-medium">
                        Pro Tip: Aggregate Categories
                      </h4>
                      <p className="text-muted-foreground mt-1 text-sm">
                        Use aggregate categories to combine votes from multiple
                        categories. Great for &quot;Overall Winner&quot; awards
                        that sum up performance across all categories!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeIn}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Users className="text-accent h-6 w-6" />
                    Adding Nominations
                  </CardTitle>
                  <CardDescription>
                    Nominations are the options voters will choose from
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground text-sm">
                    For each category, add the people, projects, or items that
                    can be voted on. You can also add descriptions or images to
                    help voters make their choice.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="bg-secondary rounded-lg p-4">
                      <h4 className="mb-2 font-medium">Text Description</h4>
                      <p className="text-muted-foreground text-sm">
                        Add context about the nomination, like achievements or
                        why they deserve the award
                      </p>
                    </div>
                    <div className="bg-secondary rounded-lg p-4">
                      <h4 className="mb-2 font-medium">Image Support</h4>
                      <p className="text-muted-foreground text-sm">
                        Paste an image URL (jpg, png, gif, webp) or Google Drive
                        link to show a photo
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeIn}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <MousePointerClick className="text-accent h-6 w-6" />
                    Controlling the Voting Flow
                  </CardTitle>
                  <CardDescription>
                    Manage which categories are active and revealed
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="border-primary bg-primary/5 rounded-lg border-2 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Play className="text-primary h-5 w-5" />
                        <h4 className="font-medium">Set Active</h4>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Only one category can be &quot;active&quot; at a time.
                        The active category is what voters see on the voting
                        page. Use this to guide the voting flow.
                      </p>
                    </div>
                    <div className="border-accent bg-accent/5 rounded-lg border-2 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Eye className="text-accent h-5 w-5" />
                        <h4 className="font-medium">Reveal Winner</h4>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Once voting is done, click &quot;Reveal&quot; to show
                        the winner on the presentation screen with a celebration
                        animation!
                      </p>
                    </div>
                  </div>
                  <div className="bg-secondary flex items-start gap-3 rounded-lg p-4">
                    <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
                    <div>
                      <h4 className="font-medium">Recommended Flow</h4>
                      <p className="text-muted-foreground mt-1 text-sm">
                        1. Set a category active → 2. Let people vote → 3. Click
                        reveal to show winner → 4. Move to next category
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeIn}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Share2 className="text-accent h-6 w-6" />
                    Sharing the Vote Link
                  </CardTitle>
                  <CardDescription>
                    Get your participants voting
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-secondary rounded-lg p-4">
                    <p className="text-muted-foreground mb-3 text-sm">
                      Share the voting link with your participants via:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Email</Badge>
                      <Badge variant="outline">Slack / Teams</Badge>
                      <Badge variant="outline">QR Code</Badge>
                      <Badge variant="outline">Meeting Chat</Badge>
                    </div>
                    <p className="text-muted-foreground mt-3 text-sm">
                      Voters don&apos;t need to sign up - they can vote
                      immediately from any device!
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.section>

        {/* Section 3: Presentation Mode */}
        <motion.section
          id="present"
          className="mb-20 scroll-mt-20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div className="mb-8" variants={fadeIn}>
            <Badge className="mb-4 border-0 bg-orange-500/20 text-orange-500">
              Step 3
            </Badge>
            <h2 className="mb-2 text-3xl font-bold">Presenting the Winners</h2>
            <p className="text-muted-foreground max-w-2xl">
              The presentation page is designed for big screens and projectors.
              It creates an exciting atmosphere for your award ceremony!
            </p>
          </motion.div>

          <div className="space-y-6">
            <motion.div variants={fadeIn}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Monitor className="h-6 w-6 text-orange-500" />
                    Setting Up the Big Screen
                  </CardTitle>
                  <CardDescription>
                    Get your presentation display ready
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="bg-secondary rounded-lg p-4">
                      <h4 className="mb-2 font-medium">1. Open Present Link</h4>
                      <p className="text-muted-foreground text-sm">
                        Navigate to your show&apos;s present URL on the device
                        connected to the projector/TV
                      </p>
                    </div>
                    <div className="bg-secondary rounded-lg p-4">
                      <h4 className="mb-2 font-medium">2. Enter Fullscreen</h4>
                      <p className="text-muted-foreground text-sm">
                        Click the fullscreen button or press F11 for the best
                        viewing experience
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeIn}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Trophy className="h-6 w-6 text-orange-500" />
                    What the Audience Sees
                  </CardTitle>
                  <CardDescription>
                    A dynamic display that updates in real-time
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-lg border p-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-sm font-bold text-blue-500">
                        1
                      </div>
                      <div>
                        <h4 className="font-medium">Active Category</h4>
                        <p className="text-muted-foreground text-sm">
                          Shows the current category name and all nominations
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border p-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-sm font-bold text-purple-500">
                        2
                      </div>
                      <div>
                        <h4 className="font-medium">Live Vote Count</h4>
                        <p className="text-muted-foreground text-sm">
                          Watch votes come in real-time as people submit their
                          choices
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border p-4">
                      <div className="bg-accent/20 text-accent flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold">
                        3
                      </div>
                      <div>
                        <h4 className="font-medium">Winner Reveal</h4>
                        <p className="text-muted-foreground text-sm">
                          Dramatic animation with confetti when you reveal the
                          winner!
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeIn}>
              <Card className="border-orange-500/30 bg-linear-to-br from-orange-500/10 to-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Sparkles className="h-6 w-6 text-yellow-500" />
                    Tips for a Great Show
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="text-accent mt-0.5 h-5 w-5 shrink-0" />
                      <span className="text-sm">
                        <strong>Build suspense:</strong> Wait a moment before
                        clicking reveal - let the anticipation build!
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="text-accent mt-0.5 h-5 w-5 shrink-0" />
                      <span className="text-sm">
                        <strong>Two devices:</strong> Use one device to manage
                        (your laptop) and another for presentation (connected to
                        projector)
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="text-accent mt-0.5 h-5 w-5 shrink-0" />
                      <span className="text-sm">
                        <strong>Test beforehand:</strong> Do a quick run-through
                        before the actual event to make sure everything works
                      </span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.section>

        {/* CTA Section */}
        <motion.section
          className="text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
        >
          <motion.div
            className="bg-card rounded-2xl border p-8 sm:p-12"
            variants={fadeIn}
          >
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl">
              Ready to Create Your Award Show?
            </h2>
            <p className="text-muted-foreground mx-auto mb-8 max-w-lg">
              Now that you know how it works, let&apos;s get your award show up
              and running in minutes!
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" className="h-12 px-8">
                <Link href="/create">
                  Create Award Show <Trophy className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-8">
                <Link href="/">
                  <ArrowLeft className="h-5 w-5" />
                  Back to Home
                </Link>
              </Button>
            </div>
          </motion.div>
        </motion.section>
      </div>
    </main>
  );
}
