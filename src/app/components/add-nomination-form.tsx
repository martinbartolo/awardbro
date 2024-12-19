"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TRPCClientError } from "@trpc/client";

export function AddNominationForm({ categoryId }: { categoryId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const addNomination = api.award.addNomination.useMutation({
    onSuccess: () => {
      setName("");
      setDescription("");
      router.refresh();
    },
    onError: (error) => {
      if (error instanceof TRPCClientError) {
        toast.error(error.message);
      } else {
        toast.error("Failed to add nomination. Please try again.");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addNomination.mutate({
      categoryId,
      name,
      description,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nomination Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter nomination"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <p className="mb-3 text-sm text-muted-foreground max-w-screen-md">
          Add a description using text, paste an image URL, or use a Google Drive sharing link (make
          sure the file is set to &quot;Anyone with the link can view&quot;)
        </p>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add some details..."
          rows={2}
        />
      </div>
      <Button
        type="submit"
        variant="secondary"
        className="w-full"
        disabled={addNomination.isPending}
      >
        {addNomination.isPending ? "Adding..." : "Add Nomination"}
      </Button>
    </form>
  );
}
