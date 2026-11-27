import { beforeEach, describe, expect, it } from "vitest";

import {
  createShow,
  open,
  reveal,
  scoresByName,
  type Show,
} from "~/test/integration/show";
import { type Visitor, visitor } from "~/test/integration/visitor";

/**
 * Who sees which scores: hosts see every score, everyone else only what the show reveals.
 * The normal category gets Dune 3 votes, Barbie 1, Oppenheimer 0.
 */
let host: Visitor;
let show: Show;

beforeEach(async () => {
  host = visitor();
  show = await createShow(host, { password: "secret1" });
  await open(host, show.normal.id);
  for (const film of ["Dune", "Dune", "Dune", "Barbie"]) {
    await visitor().api.vote({
      nominationId: show.film("normal", film).id,
    });
  }
});

/** The normal category's scores and estimated voters, as `who` sees them */
const seenBy = async (who: Visitor) => {
  const category = await who.api.getCategory({ id: show.normal.id });
  return {
    scores: scoresByName(category.nominations),
    voters: category.estimatedVoters,
  };
};
/** The host sets how the normal category's reveal shows it */
const present = (options: { hideVoteCounts?: boolean; winnerOnly?: boolean }) =>
  host.api.updateCategory({
    id: show.normal.id,
    name: show.normal.name,
    ...options,
  });
const all = { Dune: 3, Barbie: 1, Oppenheimer: 0 };
const none = { Dune: 0, Barbie: 0, Oppenheimer: 0 };

describe("scores before a category is revealed", () => {
  it("are hidden from voters and strangers, but not the live voter count", async () => {
    for (const who of [visitor(), visitor({ deviceId: null })]) {
      expect(await seenBy(who)).toEqual({ scores: none, voters: 4 });
    }
  });

  it("are all shown to the host", async () => {
    expect(await seenBy(host)).toEqual({ scores: all, voters: 4 });
  });
});

it("are the same in getSession as in getCategory", async () => {
  for (const who of [visitor(), host]) {
    const { categories } = await who.api.getSession({
      code: show.show.code,
    });
    const normal = categories.find(c => c.id === show.normal.id)!;

    expect({
      scores: scoresByName(normal.nominations),
      voters: normal.estimatedVoters,
    }).toEqual(await seenBy(who));
  }
});

describe("scores after a category is revealed", () => {
  it("are shown to everyone, but the voter count only to the host", async () => {
    await reveal(host, show.normal.id);

    expect(await seenBy(visitor())).toEqual({ scores: all, voters: null });
    expect(await seenBy(host)).toEqual({ scores: all, voters: 4 });
  });

  it("only show the winners with winnerOnly", async () => {
    await present({ winnerOnly: true });
    await reveal(host, show.normal.id);

    expect((await seenBy(visitor())).scores).toEqual({
      Dune: 3,
      Barbie: 0,
      Oppenheimer: 0,
    });
    expect((await seenBy(host)).scores).toEqual(all);
  });

  it("only show the order with hideVoteCounts", async () => {
    await present({ hideVoteCounts: true });
    await reveal(host, show.normal.id);

    expect((await seenBy(visitor())).scores).toEqual({
      Dune: 2,
      Barbie: 1,
      Oppenheimer: 0,
    });
    expect((await seenBy(host)).scores).toEqual(all);
  });
});

describe("an aggregate's scores", () => {
  // Overall adds up Best Film (Dune 3, Barbie 1) and Top Films (no rankings yet)
  const overall = async () =>
    scoresByName(
      (await visitor().api.getCategory({ id: show.aggregate.id })).nominations,
    );
  it("stay hidden until every source is revealed", async () => {
    await reveal(host, show.aggregate.id);
    expect(await overall()).toEqual(none);

    await reveal(host, show.normal.id);
    expect(await overall()).toEqual(none);

    await reveal(host, show.ranking.id);
    expect(await overall()).toEqual(all);
  });

  it("only show the order if a source hides its counts", async () => {
    await present({ hideVoteCounts: true });
    for (const id of [show.normal.id, show.ranking.id, show.aggregate.id]) {
      await reveal(host, id);
    }

    expect(await overall()).toEqual({ Dune: 2, Barbie: 1, Oppenheimer: 0 });
  });
});

describe("scores of a show without a password", () => {
  // Anyone with the link can manage it, so anyone is a host
  it("are shown to everyone, even before the reveal", async () => {
    const openShow = await createShow(visitor());
    await open(visitor(), openShow.normal.id);
    await visitor().api.vote({
      nominationId: openShow.film("normal", "Dune").id,
    });

    const category = await visitor().api.getCategory({
      id: openShow.normal.id,
    });

    expect(scoresByName(category.nominations).Dune).toBe(1);
  });
});
