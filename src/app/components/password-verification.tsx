"use client";

import { type ReactNode, useEffect, useState } from "react";

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
import { api } from "~/trpc/react";

type PasswordVerificationProps = {
  children: ReactNode;
  slug: string;
};

export function PasswordVerification({
  children,
  slug,
}: PasswordVerificationProps) {
  const [password, setPassword] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const verifyAccess = api.award.verifyManageAccess.useMutation({
    onSuccess: () => {
      setIsVerified(true);
      // Store the verification in sessionStorage
      sessionStorage.setItem(`manage-access-${slug}`, "true");
    },
    onError: error => {
      toast.error(error.message);
      setPassword("");
    },
  });

  useEffect(() => {
    // Check if this is initial access from session creation
    const isInitialAccess = sessionStorage.getItem("initial-access") === slug;
    if (isInitialAccess) {
      setIsVerified(true);
      sessionStorage.setItem(`manage-access-${slug}`, "true");
      sessionStorage.removeItem("initial-access");
    } else {
      // Check if already verified in this session
      const verified = sessionStorage.getItem(`manage-access-${slug}`);
      if (verified === "true") {
        setIsVerified(true);
      }
    }
    setIsCheckingSession(false);
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    try {
      await verifyAccess.mutateAsync({ slug, password });
    } finally {
      setIsVerifying(false);
    }
  };

  // Don't render anything until we've checked sessionStorage
  if (isCheckingSession) {
    return null;
  }

  if (isVerified) {
    return <>{children}</>;
  }

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
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
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
