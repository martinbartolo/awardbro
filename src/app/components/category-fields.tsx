"use client";

import {
  CheckSquareOffsetIcon,
  type Icon,
  ImageIcon,
  ListNumbersIcon,
  StackIcon,
} from "@phosphor-icons/react";
import { type Control } from "react-hook-form";

import { SourceCategoryCheckboxes } from "~/app/components/source-category-checkboxes";
import { Badge } from "~/components/ui/badge";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { type CategoryType } from "~/generated/prisma/enums";
import { isWaiting, stageLabel, stageOf } from "~/lib/stages";
import { cn } from "~/lib/utils";

/** The category types, in the order they're offered, each with what it means for voters */
export const CATEGORY_TYPES: Record<
  CategoryType,
  {
    label: string;
    description: string;
    icon: Icon;
    /** Its icon's colour in its badge (a mark colour); a normal category has no badge */
    iconClassName?: string;
  }
> = {
  NORMAL: {
    label: "Normal",
    description: "Voters pick one nomination.",
    icon: CheckSquareOffsetIcon,
  },
  IMAGE: {
    label: "Image",
    description: "Voters pick one picture. Each nomination is a picture link.",
    icon: ImageIcon,
    iconClassName: "text-mark-2",
  },
  RANKING: {
    label: "Ranking",
    description:
      "Voters rank their favourites. Higher places score more points.",
    icon: ListNumbersIcon,
    iconClassName: "text-mark-3",
  },
  AGGREGATE: {
    label: "Aggregate",
    description:
      "Adds up the results of other categories. No voting of its own.",
    icon: StackIcon,
    iconClassName: "text-mark-1",
  },
};

/** A category's type next to its name on the manage page; a normal category has none */
export function CategoryTypeBadge({
  type,
  rankingTop,
}: {
  type: CategoryType;
  rankingTop: number | null;
}) {
  const { label, icon: Icon, iconClassName } = CATEGORY_TYPES[type];
  if (!iconClassName) return null;
  return (
    // The type in the foreground colour, its icon in a mark colour (readable in both themes)
    <Badge
      variant="secondary"
      className="bg-muted text-foreground gap-1.5 rounded-full px-2.5 py-1"
    >
      <Icon weight="duotone" className={cn("size-3.5", iconClassName)} />
      {label}
      {type === "RANKING" && ` (Top ${rankingTop})`}
    </Badge>
  );
}

/** Where a category is in the show, next to its name on the manage page, once it has started */
export function CategoryStageBadge({
  category,
}: {
  category: Parameters<typeof stageLabel>[0];
}) {
  if (stageOf(category) === "ready" && !isWaiting(category)) return null;
  return <Badge variant="outline">{stageLabel(category)}</Badge>;
}

/** The fields the add and edit category forms have in common */
export type CategoryFieldValues = {
  name: string;
  description?: string;
  rankingTop?: number;
  sourceCategories?: string[];
};

/**
 * A category's name and description, and the fields of its type: a ranking's number of places,
 * or the categories an aggregate adds up. Used by the add and edit forms.
 */
export function CategoryFields({
  control,
  type,
  sourceOptions,
  lockedPlaces,
}: {
  control: Control<CategoryFieldValues>;
  type: CategoryType;
  /** The categories an aggregate can add up: the show's non-aggregate categories */
  sourceOptions: { id: string; name: string }[];
  /** A ranking's number of places when people have voted, so it can't change */
  lockedPlaces?: number | null;
}) {
  return (
    <>
      <FormField
        control={control}
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
        control={control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description (Optional)</FormLabel>
            <FormControl>
              <Textarea {...field} value={field.value ?? ""} rows={2} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {type === "RANKING" && lockedPlaces != null && (
        <p className="text-muted-foreground text-sm">
          Voters rank their top {lockedPlaces}. People have already voted, and
          changing this would change their points. Reset the category&apos;s
          votes to change it.
        </p>
      )}
      {type === "RANKING" && lockedPlaces == null && (
        <FormField
          control={control}
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
                  value={field.value ?? ""}
                  onChange={e =>
                    field.onChange(
                      e.target.value === ""
                        ? undefined
                        : parseInt(e.target.value, 10),
                    )
                  }
                  className="w-24"
                />
              </FormControl>
              <FormDescription>
                Voters rank their top {field.value ?? "N"}. 1st place gets{" "}
                {field.value ?? "N"} points, 2nd gets one fewer, and so on.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {type === "AGGREGATE" && (
        <FormField
          control={control}
          name="sourceCategories"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categories to add up</FormLabel>
              <FormDescription>
                Nominations with the same name in these categories have their
                scores added together.
              </FormDescription>
              <SourceCategoryCheckboxes
                options={sourceOptions}
                value={field.value ?? []}
                onChange={field.onChange}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  );
}
