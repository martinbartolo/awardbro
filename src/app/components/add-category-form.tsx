"use client";

import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type CategoryFormValues, categoryFormSchema } from "~/lib/schemas";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";

export function AddCategoryForm({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      sessionId,
      name: "",
      description: "",
      isAggregate: false,
      sourceCategories: [],
    },
  });

  const { data: categories } = api.award.getSessionCategories.useQuery({ sessionId });

  const addCategory = api.award.addCategory.useMutation({
    onSuccess: () => {
      toast.success("Category added successfully");
      form.reset();
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (values: CategoryFormValues) => {
    addCategory.mutate({
      ...values,
      sourceCategories: values.isAggregate ? values.sourceCategories : undefined,
    });
  };

  const isAggregate = form.watch("isAggregate");

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
              name="isAggregate"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          if (!checked) {
                            form.setValue("sourceCategories", []);
                          }
                        }}
                      />
                    </FormControl>
                    <FormLabel className="flex items-center gap-2">
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
                                <li>
                                  John: 2 votes in Performance + 3 in Technical = 5 total votes
                                </li>
                              </ul>
                              <p>Voting is disabled for aggregate categories.</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isAggregate && categories && categories.length > 0 && (
              <FormField
                control={form.control}
                name="sourceCategories"
                render={() => (
                  <FormItem>
                    <FormLabel>Select Source Categories</FormLabel>
                    <p className="text-sm text-muted-foreground mb-2 max-w-screen-md">
                      Choose the categories whose votes you want to combine. Nominations that appear
                      in multiple source categories will have their votes added together.
                    </p>
                    <div className="space-y-2">
                      {categories.map((category) => (
                        <FormField
                          key={category.id}
                          control={form.control}
                          name="sourceCategories"
                          render={({ field }) => (
                            <FormItem key={category.id} className="flex items-center space-x-2">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(category.id)}
                                  onCheckedChange={(checked) => {
                                    const currentValue = field.value ?? [];
                                    const newValue = checked
                                      ? [...currentValue, category.id]
                                      : currentValue.filter((id) => id !== category.id);
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

            <Button type="submit" className="w-full" disabled={addCategory.isPending}>
              {addCategory.isPending ? "Adding..." : "Add Category"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
