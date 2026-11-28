"use client";

import { QRCodeSVG } from "qrcode.react";

import { useOrigin } from "~/lib/hooks/useOrigin";
import { voteUrl } from "~/lib/join";

/** The site's address without the scheme: the homepage has the room code field */
const useJoinAddress = () => {
  const origin = useOrigin();
  return origin ? { origin, address: new URL(origin).host } : null;
};

/**
 * How voters join, big enough to scan and read across a room: the QR code, which opens the vote
 * page, and the address and room code to type instead.
 */
export function JoinPanel({ code }: { code: string }) {
  const join = useJoinAddress();
  // Rendered in the browser only: the address depends on where the page was opened
  if (!join) return null;

  return (
    <div className="flex items-center gap-14">
      {/* White in both themes: phones read a QR code best as dark on white */}
      <div className="shadow-lift size-82 shrink-0 rounded-[calc(var(--u)*3.4)] bg-white p-5.5">
        <QRCodeSVG
          value={voteUrl(join.origin, code)}
          size={256}
          marginSize={0}
          fgColor="#16153a"
          title="Scan to vote"
          className="size-full"
        />
      </div>
      <div className="text-muted-foreground text-stage-lead leading-tight font-medium">
        <p>Scan to vote, or go to</p>
        <p className="text-foreground text-stage-body mt-1 font-semibold">
          {join.address}
        </p>
        <p className="mt-5">and enter</p>
        <p className="text-foreground text-stage-code mt-1.5 leading-none font-bold tracking-[0.06em]">
          {code}
        </p>
      </div>
    </div>
  );
}

/** The address and room code, small in a corner, while the screen is busy with an award */
export function RoomCodeChip({ code }: { code: string }) {
  const join = useJoinAddress();
  if (!join) return null;

  return (
    <p className="bg-card shadow-soft text-stage-small flex shrink-0 items-baseline gap-3 rounded-[calc(var(--u)*2)] px-5 py-2 font-medium">
      <span className="text-muted-foreground">{join.address}</span>
      <span className="text-card-foreground text-stage-body font-bold tracking-[0.08em]">
        {code}
      </span>
    </p>
  );
}
