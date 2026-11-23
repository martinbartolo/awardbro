"use client";

import { useState } from "react";

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
import { api } from "~/trpc/react";

type PasswordVerificationProps = {
  slug: string;
};

/**
 * Shown on the manage page when the visitor has no manage-access cookie for this show.
 * A correct password makes the server set the cookie; refreshing then renders the manage UI.
 */
export function PasswordVerification({ slug }: PasswordVerificationProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");

  const verifyAccess = api.award.verifyManageAccess.useMutation({
    onSuccess: () => {
      router.refresh();
    },
    onError: error => {
      toast.error(error.message);
      setPassword("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyAccess.mutate({ slug, password });
  };

  // Stay in the "verifying" state through the refresh so the form doesn't flash back
  const isVerifying = verifyAccess.isPending || verifyAccess.isSuccess;

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
