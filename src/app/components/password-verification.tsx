"use client";

import { useEffect, useState, useTransition } from "react";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useTRPC } from "~/trpc/react";

type PasswordVerificationProps = {
  code: string;
  /** The show's name: the username its password is saved under */
  name: string;
};

/**
 * Shown on the manage page when the visitor has no manage-access cookie for this show.
 * A correct password makes the server set the cookie; refreshing then renders the manage UI.
 */
export function PasswordVerification({
  code,
  name,
}: PasswordVerificationProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [isRefreshing, startRefresh] = useTransition();

  const trpc = useTRPC();
  const verifyAccess = useMutation(
    trpc.award.verifyManageAccess.mutationOptions({
      onSuccess: () => {
        startRefresh(() => router.refresh());
      },
      onError: error => {
        toast.error(error.message);
        setPassword("");
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyAccess.mutate({ code, password });
  };

  // Stay in the "verifying" state through the refresh so the form doesn't flash back
  const isVerifying = verifyAccess.isPending || isRefreshing;

  // The password was right, but the refreshed page still shows this form: the browser didn't
  // keep the access cookie. Say so, and make the form usable again (the password stays, so
  // the host can retry once cookies are allowed).
  const { isSuccess, reset } = verifyAccess;
  useEffect(() => {
    if (isSuccess && !isRefreshing) {
      toast.error(
        "Couldn't keep you signed in. Check that cookies are allowed for this site, then try again.",
      );
      reset();
    }
  }, [isSuccess, isRefreshing, reset]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Password Required</CardTitle>
          <CardDescription>
            Please enter your management password to access this page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <ShowUsername value={name} />
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter management password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isVerifying}>
              {isVerifying ? "Verifying..." : "Access Management"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * The username that goes with a show's password, for password managers: the show's name, the one
 * thing both the create form and the password form know (the room code doesn't exist until the
 * show is created). Without it, Safari and iCloud Passwords guess the username from the nearest
 * text field, and then offer saved passwords in every text field. Hidden from everyone else:
 * hosts never type it.
 */
export function ShowUsername({ value }: { value: string }) {
  return (
    <input
      type="text"
      name="username"
      autoComplete="username"
      value={value}
      readOnly
      tabIndex={-1}
      aria-hidden
      className="sr-only"
    />
  );
}

/** A host page (manage or run) for a visitor without access to the show: only the password form */
export function PasswordPage({ code, name }: { code: string; name: string }) {
  return (
    <main className="bg-background text-foreground min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <PasswordVerification code={code} name={name} />
      </div>
    </main>
  );
}
