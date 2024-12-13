"use client";

import { Button } from "~/components/ui/button";
import Link from "next/link";
import { ArrowRight, Copy } from 'lucide-react';
import { toast } from "sonner";

interface SessionActionsProps {
  slug: string;
}

export function SessionActions({ slug }: SessionActionsProps) {
  const copyVotingUrl = () => {
    const votingUrl = `${window.location.origin}/vote/${slug}`;
    void navigator.clipboard.writeText(votingUrl);
    toast.success("URL Copied!", {
      description: "The voting URL has been copied to your clipboard.",
    });
  };

  return (
    <div className="flex flex-wrap gap-3">
     <Button 
        variant="outline" 
        className="w-full sm:w-auto group"
        onClick={copyVotingUrl}
      >
        Share URL
        <Copy className="size-4 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12" />
      </Button>
      <Button asChild className="w-full sm:w-auto group">
        <Link href={`/vote/${slug}`} target="_blank">
          Voting Page
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      </Button>
      <Button asChild className="w-full sm:w-auto group">
        <Link href={`/present/${slug}`} target="_blank">
          Presentation
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      </Button>
    </div>
  );
} 