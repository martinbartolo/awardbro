"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { HelpCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { type CategoryType } from "~/generated/prisma/enums";
import { categoryFormSchema, type CategoryFormValues } from "~/lib/schemas";
import { api } from "~/trpc/react";

const categoryTypeDescriptions: Record<CategoryType, string> = {
  NORMAL: "Standard category with text-based nominations",
  IMAGE: "Category for image-based nominations with captions",
  AGGREGATE: "Combines votes from multiple source categories",
  RANKING: "Voters rank their top X choices, points awarded by position",
};

export function AddCategoryForm({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      sessionId,
      name: "",
      description: "",
      type: "NORMAL",
      sourceCategories: [],
      rankingTop: 3,
      hideVoteCounts: false,
    },
  });

  const { data: categories } = api.award.getSessionCategories.useQuery({
    sessionId,
  });

  const utils = api.useUtils();

  const addCategory = api.award.addCategory.useMutation({
    onSuccess: async () => {
      toast.success("Category added successfully");
      form.reset({
        sessionId,
        name: "",
        description: "",
        type: "NORMAL",
        sourceCategories: [],
        rankingTop: 3,
        hideVoteCounts: false,
      });
      router.refresh();
      await utils.award.getSessionCategories.invalidate({ sessionId });
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const onSubmit = (values: CategoryFormValues) => {
    if (values.type === "AGGREGATE" && values.sourceCategories.length === 0) {
      toast.error("Please select at least one source category");
      return;
    }

    if (
      values.type === "RANKING" &&
      (!values.rankingTop || values.rankingTop < 2)
    ) {
      toast.error("Please specify how many options to rank (at least 2)");
      return;
    }

    addCategory.mutate({
      ...values,
      sourceCategories:
        values.type === "AGGREGATE" ? values.sourceCategories : [],
      rankingTop: values.type === "RANKING" ? values.rankingTop : undefined,
    });
  };

  const categoryType = useWatch({ control: form.control, name: "type" });
  const sourceCategories = useWatch({
    control: form.control,
    name: "sourceCategories",
  });
  const rankingTop = useWatch({
    control: form.control,
    name: "rankingTop",
  });
  const isSubmitDisabled =
    addCategory.isPending ||
    (categoryType === "AGGREGATE" && sourceCategories.length === 0) ||
    (categoryType === "RANKING" && (!rankingTop || rankingTop < 2));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Category</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Category Type
                    <TooltipProvider>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <HelpCircle className="text-muted-foreground h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipContent
                          side="right"
                          className="max-w-[280px] p-4 text-sm"
                        >
                          <div className="space-y-2">
                            <p>
                              <strong>Normal:</strong> Standard text-based
                              nominations.
                            </p>
                            <p>
                              <strong>Image:</strong> Image-based nominations
                              with captions. Perfect for photo contests.
                            </p>
                            <p>
                              <strong>Ranking:</strong> Voters rank their top X
                              choices. Points are awarded based on position.
                            </p>
                            <p>
                              <strong>Aggregate:</strong> Combines votes from
                              multiple categories. Voting is disabled.
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <Select
                    onValueChange={value => {
                      field.onChange(value);
                      if (value !== "AGGREGATE") {
                        form.setValue("sourceCategories", []);
                      }
                      if (value !== "RANKING") {
                        form.setValue("rankingTop", undefined);
                      } else {
                        form.setValue("rankingTop", 3);
                      }
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="NORMAL">Normal</SelectItem>
                      <SelectItem value="IMAGE">Image</SelectItem>
                      <SelectItem value="RANKING">Ranking</SelectItem>
                      <SelectItem value="AGGREGATE">Aggregate</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {categoryTypeDescriptions[field.value as CategoryType]}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {categoryType === "RANKING" && (
              <FormField
                control={form.control}
                name="rankingTop"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>How many to rank?</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={2}
                        max={10}
                        {...field}
                        value={field.value ?? 3}
                        onChange={e =>
                          field.onChange(parseInt(e.target.value, 10) || 3)
                        }
                        placeholder="3"
                      />
                    </FormControl>
                    <FormDescription>
                      Voters will rank their top {field.value ?? 3} choices. 1st
                      place gets {field.value ?? 3} points, 2nd gets{" "}
                      {(field.value ?? 3) - 1}, etc.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Best Performance" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={typeof field.value === "string" ? field.value : ""}
                      placeholder="Describe what this category is about..."
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hideVoteCounts"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start gap-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="flex flex-col gap-1 leading-none">
                    <FormLabel>Hide vote counts in presentation</FormLabel>
                    <FormDescription>
                      Only show rankings without revealing the actual vote
                      numbers
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {categoryType === "AGGREGATE" &&
              categories &&
              categories.length > 0 && (
                <FormField
                  control={form.control}
                  name="sourceCategories"
                  render={() => (
                    <FormItem>
                      <FormLabel>Select Source Categories</FormLabel>
                      <p className="text-muted-foreground mb-2 max-w-(--breakpoint-md) text-sm">
                        Choose the categories whose votes you want to combine.
                        Nominations that appear in multiple source categories
                        will have their votes added together.
                      </p>
                      <div className="space-y-2">
                        {categories.map(category => (
                          <FormField
                            key={category.id}
                            control={form.control}
                            name="sourceCategories"
                            render={({ field }) => (
                              <FormItem
                                key={category.id}
                                className="flex flex-row items-center gap-2 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value.includes(category.id)}
                                    onCheckedChange={checked => {
                                      const currentValue = field.value;
                                      const newValue = checked
                                        ? [...currentValue, category.id]
                                        : currentValue.filter(
                                            id => id !== category.id,
                                          );
                                      field.onChange(newValue);
                                    }}
                                  />
                                </FormControl>
                                <FormLabel>{category.name}</FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

            <Button type="submit" disabled={isSubmitDisabled}>
              {addCategory.isPending ? "Adding..." : "Add Category"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
