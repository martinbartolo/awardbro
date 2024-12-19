"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Checkbox } from "~/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

export function AddCategoryForm({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isAggregate, setIsAggregate] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const { data: categories } = api.award.getSessionCategories.useQuery({ sessionId });

  const addCategory = api.award.addCategory.useMutation({
    onSuccess: () => {
      setName("");
      setDescription("");
      setIsAggregate(false);
      setSelectedCategories([]);
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addCategory.mutate({
      sessionId,
      name,
      description,
      isAggregate,
      sourceCategories: isAggregate ? selectedCategories : undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Category</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Category Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Best Performance"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this category is about..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isAggregate"
                checked={isAggregate}
                onCheckedChange={(checked) => {
                  setIsAggregate(checked === true);
                  if (!checked) setSelectedCategories([]);
                }}
              />
              <Label htmlFor="isAggregate" className="flex items-center gap-2">
                Create as Aggregate Category
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[260px] p-4 text-sm">
                      <div className="space-y-2">
                        <p>
                          An aggregate category automatically combines votes from multiple
                          categories.
                        </p>
                        <p>
                          For example, if &quot;Best Overall&quot; aggregates &quot;Best
                          Performance&quot; and &quot;Best Technical&quot;:
                        </p>
                        <ul className="list-disc pl-4">
                          <li>John: 2 votes in Performance + 3 in Technical = 5 total votes</li>
                        </ul>
                        <p>Voting is disabled for aggregate categories.</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
            </div>

            {isAggregate && categories && categories.length > 0 && (
              <div className="pt-2 space-y-2">
                <Label>Select Source Categories</Label>
                <p className="text-sm text-muted-foreground mb-2 max-w-screen-md">
                  Choose the categories whose votes you want to combine. Nominations that appear in
                  multiple source categories will have their votes added together.
                </p>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={category.id}
                        checked={selectedCategories.includes(category.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedCategories([...selectedCategories, category.id]);
                          } else {
                            setSelectedCategories(
                              selectedCategories.filter((id) => id !== category.id)
                            );
                          }
                        }}
                      />
                      <Label htmlFor={category.id}>{category.name}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={addCategory.isPending || (isAggregate && selectedCategories.length === 0)}
          >
            {addCategory.isPending ? "Adding..." : "Add Category"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
