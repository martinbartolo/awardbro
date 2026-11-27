/**
 * What the host's actions do to a show's categories, as the server will do them, for showing an
 * action straight away (useShowChange). Derived data (an aggregate's copies and scores) follows
 * once the server has answered.
 */

type Nomination = { id: string; _count: { votes: number } };
type Category<N extends Nomination = Nomination> = {
  id: string;
  nominations: N[];
  sourceCategories: { id: string }[];
  estimatedVoters: number | null;
};

/** The categories with one changed by `update` */
export const updateCategory = <C extends { id: string }>(
  categories: C[],
  id: string,
  update: (category: C) => C,
) => categories.map(c => (c.id === id ? update(c) : c));

/** The categories with a category's new name in the aggregates that add it up */
export const renameSource = <
  C extends { sourceCategories: { id: string; name: string }[] },
>(
  categories: C[],
  id: string,
  name: string,
) =>
  categories.map(c => ({
    ...c,
    sourceCategories: c.sourceCategories.map(s =>
      s.id === id ? { ...s, name } : s,
    ),
  }));

/** A category with its votes reset: every score 0, and no one counted as voting */
export const withoutVotes = <C extends Category>(category: C): C => ({
  ...category,
  nominations: category.nominations.map(n => ({ ...n, _count: { votes: 0 } })),
  estimatedVoters: category.estimatedVoters === null ? null : 0,
});

/** The categories without a category, which also leaves the aggregates that added it up */
export const withoutCategory = <C extends Category>(
  categories: C[],
  id: string,
) =>
  categories
    .filter(c => c.id !== id)
    .map(c => ({
      ...c,
      sourceCategories: c.sourceCategories.filter(s => s.id !== id),
    }));

/** The categories with a nomination changed by `update` */
export const updateNomination = <N extends Nomination, C extends Category<N>>(
  categories: C[],
  id: string,
  update: (nomination: N) => N,
) =>
  categories.map(c => ({
    ...c,
    nominations: c.nominations.map(n => (n.id === id ? update(n) : n)),
  }));

/**
 * How a nomination shown before the server has saved it is told apart: its id starts with this.
 * It has nothing to edit or delete until the server has it.
 */
export const ADDING = "adding-";

/** Whether a nomination is being added, shown before the server has saved it */
export const isAdding = (nomination: { id: string }) =>
  nomination.id.startsWith(ADDING);

/** The categories without a nomination */
export const withoutNomination = <C extends Category>(
  categories: C[],
  id: string,
) =>
  categories.map(c => ({
    ...c,
    nominations: c.nominations.filter(n => n.id !== id),
  }));

/**
 * The running order with a category moved one place up or down, swapped with its neighbour. At the
 * top (or bottom) it stays where it is.
 */
export const moveInOrder = <C extends { id: string }>(
  categories: C[],
  id: string,
  direction: "up" | "down",
) => {
  const from = categories.findIndex(c => c.id === id);
  const to = from + (direction === "up" ? -1 : 1);
  if (from === -1 || to < 0 || to >= categories.length) return categories;
  const order = [...categories];
  [order[from], order[to]] = [order[to]!, order[from]!];
  return order;
};
