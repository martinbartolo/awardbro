"use client";

import { motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";

import { useOrigin } from "~/lib/hooks/useOrigin";
import { voteUrl } from "~/lib/join";

type JoinInfoProps = {
  code: string;
  /**
   * "full": the QR code, join address and room code, big enough to scan across a room.
   * "corner": only the address and code, small in a corner, so it doesn't distract from a reveal.
   */
  variant: "full" | "corner";
};

/** How voters join, shown on the big screen */
export function JoinInfo({ code, variant }: JoinInfoProps) {
  const origin = useOrigin();
  // Rendered in the browser only: the address depends on where the page was opened
  if (!origin) return null;
  // The homepage has the room code field, so voters only need the bare address
  const joinAddress = new URL(origin).host;

  if (variant === "corner") {
    return (
      <motion.div
        className="bg-background/80 text-muted-foreground fixed bottom-4 left-4 z-40 rounded-lg border px-4 py-2 text-lg backdrop-blur"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {joinAddress} ·{" "}
        <span className="text-foreground font-mono font-bold tracking-wide">
          {code}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex flex-col items-center justify-center gap-8 sm:flex-row"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className="rounded-2xl bg-white p-4">
        <QRCodeSVG
          value={voteUrl(origin, code)}
          size={240}
          marginSize={1}
          title="Scan to vote"
        />
      </div>
      <div className="text-center sm:text-left">
        <p className="text-3xl font-semibold">Scan to vote</p>
        <p className="text-muted-foreground mt-3 text-xl">
          or go to{" "}
          <span className="text-foreground font-medium">{joinAddress}</span> and
          enter
        </p>
        <p className="mt-2 font-mono text-7xl font-bold tracking-wide">
          {code}
        </p>
      </div>
    </motion.div>
  );
}
