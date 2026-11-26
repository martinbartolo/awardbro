import { describe, expect, it } from "vitest";

import { testDb } from "~/test/integration/db";
import {
  createShow,
  scoresByName,
  type Show,
  showState,
  votedShow,
} from "~/test/integration/show";
import { expectError, type Visitor, visitor } from "~/test/integration/visitor";

/** A category's nominations as the host sees them: name, description and score */
const nominationsOf = async (host: Visitor, categoryId: string) =>
  (await host.api.getCategory({ id: categoryId })).nominations
    .map(n => ({
      name: n.name,
      description: n.description,
      score: n._count.votes,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

const scoresOf = async (host: Visitor, categoryId: string) =>
  scoresByName((await host.api.getCategory({ id: categoryId })).nominations);

// In votedShow, one voter picked Dune in the normal category and ranked Dune, then Barbie, in the
// top-2 ranking category. Both are sources of the aggregate "Overall".
describe("editing a nomination", () => {
  const rename = (
    host: Visitor,
    show: Show,
    category: "normal" | "ranking",
    from: string,
    to: string,
    description?: string,
  ) =>
    host.api.updateNomination({
      id: show.film(category, from).id,
      name: to,
      description,
    });

  it("keeps its votes", async () => {
    const { host, show } = await votedShow();

    await rename(host, show, "normal", "Dune", "Dune: Part Two");

    expect(await scoresOf(host, show.normal.id)).toEqual({
      "Dune: Part Two": 1,
      Barbie: 0,
      Oppenheimer: 0,
    });
  });

  it("gives the new name its own copy in the aggregate while another source still uses the old one", async () => {
    const { host, show } = await votedShow();

    const { mergedIn } = await rename(
      host,
      show,
      "normal",
      "Dune",
      "Dune: Part Two",
    );

    expect(mergedIn).toEqual([]);
    // The ranking category's Dune (2 points) keeps the old copy
    expect(await scoresOf(host, show.aggregate.id)).toEqual({
      Dune: 2,
      "Dune: Part Two": 1,
      Barbie: 1,
      Oppenheimer: 0,
    });
  });

  it("renames the aggregate's copy when no other source uses the old name", async () => {
    const host = visitor();
    const show = await createShow(host);
    const added = await show.addNomination({
      categoryId: show.normal.id,
      name: "Poor Thing",
    });

    await host.api.updateNomination({
      id: added.id,
      name: "Poor Things",
      description: "Lanthimos",
    });

    expect(
      (await nominationsOf(host, show.aggregate.id)).filter(n =>
        n.name.startsWith("Poor"),
      ),
    ).toEqual([{ name: "Poor Things", description: "Lanthimos", score: 0 }]);
  });

  it("renames the aggregate's copy in place, so it keeps its place in the list", async () => {
    const host = visitor();
    const show = await createShow(host);
    const added = await show.addNomination({
      categoryId: show.normal.id,
      name: "Poor Thing",
    });
    const copy = await testDb.nomination.findFirstOrThrow({
      where: { categoryId: show.aggregate.id, name: "Poor Thing" },
    });

    await host.api.updateNomination({ id: added.id, name: "Poor Things" });

    expect(
      await testDb.nomination.findUniqueOrThrow({ where: { id: copy.id } }),
    ).toMatchObject({ name: "Poor Things", createdAt: copy.createdAt });
  });

  it("keeps its description when the edit leaves it out", async () => {
    const host = visitor();
    const show = await createShow(host);
    const added = await show.addNomination({
      categoryId: show.normal.id,
      name: "Poor Things",
      description: "Lanthimos",
    });

    await host.api.updateNomination({ id: added.id, name: "Poor Things!" });

    expect(
      await testDb.nomination.findUniqueOrThrow({ where: { id: added.id } }),
    ).toMatchObject({ name: "Poor Things!", description: "Lanthimos" });
  });

  it.each([
    ["no link", undefined],
    ["text that isn't a link", "a nice photo"],
  ])("is refused in an image category with %s", async (_, description) => {
    const host = visitor();
    const show = await createShow(host);
    const photos = await show.addCategory({
      name: "Best Photo",
      type: "IMAGE",
      sourceCategories: [],
    });
    const photo = await show.addNomination({
      categoryId: photos.id,
      name: "Sunset",
      description: "https://example.com/sunset.jpg",
    });
    const before = await showState(show.show.id);

    await Promise.all([
      expectError(
        show.addNomination({
          categoryId: photos.id,
          name: "Dawn",
          description,
        }),
        "BAD_REQUEST",
      ),
      expectError(
        host.api.updateNomination({
          id: photo.id,
          name: "Sunset",
          description: description ?? "",
        }),
        "BAD_REQUEST",
      ),
    ]);

    expect(await showState(show.show.id)).toEqual(before);
  });

  it("merges with another source's nomination of the new name, and says so", async () => {
    const { host, show } = await votedShow();
    await rename(host, show, "normal", "Dune", "Dune: Part Two");

    // Now no source has "Dune" any more, and the ranking's Dune joins the normal one
    const { mergedIn } = await rename(
      host,
      show,
      "ranking",
      "Dune",
      "Dune: Part Two",
    );

    expect(mergedIn).toEqual(["Overall"]);
    expect(await scoresOf(host, show.aggregate.id)).toEqual({
      "Dune: Part Two": 3,
      Barbie: 1,
      Oppenheimer: 0,
    });
  });

  it("changes the aggregate's copy's description when it's the only nomination of that name", async () => {
    const host = visitor();
    const show = await createShow(host);
    const added = await show.addNomination({
      categoryId: show.normal.id,
      name: "Poor Things",
    });

    await host.api.updateNomination({
      id: added.id,
      name: "Poor Things",
      description: "Lanthimos",
    });

    expect(
      await testDb.nomination.findMany({
        where: { categoryId: show.aggregate.id, name: "Poor Things" },
        select: { description: true },
      }),
    ).toEqual([{ description: "Lanthimos" }]);
  });

  it.each([
    ["the same name", "Barbie"],
    ["a different case", " barbie "],
  ])(
    "is refused if it would repeat a nomination in its category: %s",
    async (_, name) => {
      const { host, show } = await votedShow();
      const before = await showState(show.show.id);

      await expectError(
        rename(host, show, "normal", "Oppenheimer", name),
        "BAD_REQUEST",
      );

      expect(await showState(show.show.id)).toEqual(before);
    },
  );

  it("can take the same name as another with a different description", async () => {
    const { host, show } = await votedShow();

    await rename(host, show, "normal", "Oppenheimer", "Barbie", "The movie");

    expect(
      (await nominationsOf(host, show.normal.id)).map(n => n.name),
    ).toEqual(["Barbie", "Barbie", "Dune"]);
  });

  it("can change only its case", async () => {
    const { host, show } = await votedShow();

    await rename(host, show, "normal", "Dune", "DUNE");

    expect(await scoresOf(host, show.normal.id)).toMatchObject({ DUNE: 1 });
  });

  it("is refused in an aggregate, whose nominations are copies", async () => {
    const { host, show } = await votedShow();
    const copy = await testDb.nomination.findFirstOrThrow({
      where: { categoryId: show.aggregate.id, name: "Dune" },
    });

    const before = await showState(show.show.id);

    await expectError(
      host.api.updateNomination({ id: copy.id, name: "Dune 2" }),
      "BAD_REQUEST",
    );

    expect(await showState(show.show.id)).toEqual(before);
  });
});

describe("editing a category", () => {
  it("changes its name and description", async () => {
    const { host, show } = await votedShow();

    await host.api.updateCategory({
      id: show.normal.id,
      name: "Best Picture",
      description: "The big one",
    });

    expect(await host.api.getCategory({ id: show.normal.id })).toMatchObject({
      name: "Best Picture",
      description: "The big one",
      type: "NORMAL",
    });
  });

  it("refuses to change a ranking's places once someone has voted", async () => {
    const { host, show } = await votedShow();

    await expectError(
      host.api.updateCategory({
        id: show.ranking.id,
        name: "Top Films",
        description: "",
        rankingTop: 3,
      }),
      "BAD_REQUEST",
    );

    expect(await host.api.getCategory({ id: show.ranking.id })).toMatchObject({
      rankingTop: 2,
    });
  });

  it("changes a ranking's places after its votes are reset", async () => {
    const { host, show } = await votedShow();
    await host.api.resetCategoryVotes({ categoryId: show.ranking.id });

    await host.api.updateCategory({
      id: show.ranking.id,
      name: "Top Films",
      description: "",
      rankingTop: 3,
    });

    expect(await host.api.getCategory({ id: show.ranking.id })).toMatchObject({
      rankingTop: 3,
    });
  });

  it("changes an aggregate's sources and its nominations with them", async () => {
    const { host, show } = await votedShow();
    await show.addNomination({
      categoryId: show.ranking.id,
      name: "Poor Things",
    });

    await host.api.updateCategory({
      id: show.aggregate.id,
      name: "Overall",
      description: "",
      sourceCategories: [show.normal.id],
    });

    expect(await scoresOf(host, show.aggregate.id)).toEqual({
      Dune: 1,
      Barbie: 0,
      Oppenheimer: 0,
    });

    await host.api.updateCategory({
      id: show.aggregate.id,
      name: "Overall",
      description: "",
      sourceCategories: [show.normal.id, show.ranking.id],
    });

    expect(await scoresOf(host, show.aggregate.id)).toEqual({
      Dune: 3,
      Barbie: 1,
      Oppenheimer: 0,
      "Poor Things": 0,
    });
  });

  it("refuses an aggregate, itself, or another show's category as a source", async () => {
    const { host, show } = await votedShow();
    const other = await createShow(visitor());
    const before = await showState(show.show.id);

    await Promise.all(
      [[show.aggregate.id], [show.normal.id, other.normal.id], []].map(
        sourceCategories =>
          expectError(
            host.api.updateCategory({
              id: show.aggregate.id,
              name: "Overall",
              description: "",
              sourceCategories,
            }),
            "BAD_REQUEST",
          ),
      ),
    );

    expect(await showState(show.show.id)).toEqual(before);
  });
});

describe("deleting from a source", () => {
  const copiesNamed = (categoryId: string, name: string) =>
    testDb.nomination.count({ where: { categoryId, name } });

  it("removes the aggregate's copy of a nomination no other source has", async () => {
    const host = visitor();
    const show = await createShow(host);
    const added = await show.addNomination({
      categoryId: show.normal.id,
      name: "Poor Things",
    });

    await host.api.deleteNomination({ id: added.id });

    expect(await copiesNamed(show.aggregate.id, "Poor Things")).toBe(0);
  });

  it("keeps the aggregate's copy while another source has the name", async () => {
    const { host, show } = await votedShow();

    await host.api.deleteNomination({ id: show.film("normal", "Dune").id });

    expect(await scoresOf(host, show.aggregate.id)).toMatchObject({ Dune: 2 });
  });

  it("removes the copies only a deleted category had", async () => {
    const host = visitor();
    const show = await createShow(host);
    await show.addNomination({
      categoryId: show.ranking.id,
      name: "Poor Things",
    });

    await host.api.deleteCategory({ id: show.ranking.id });

    expect(
      (await nominationsOf(host, show.aggregate.id)).map(n => n.name),
    ).toEqual(["Barbie", "Dune", "Oppenheimer"]);
  });

  it("doesn't bring back an aggregate copy the host deleted", async () => {
    const host = visitor();
    const show = await createShow(host);
    const copy = await testDb.nomination.findFirstOrThrow({
      where: { categoryId: show.aggregate.id, name: "Barbie" },
    });
    await host.api.deleteNomination({ id: copy.id });

    await show.addNomination({
      categoryId: show.normal.id,
      name: "Poor Things",
    });
    await host.api.updateNomination({
      id: show.film("normal", "Dune").id,
      name: "Dune",
      description: "Part Two",
    });

    expect(await copiesNamed(show.aggregate.id, "Barbie")).toBe(0);
  });
});
