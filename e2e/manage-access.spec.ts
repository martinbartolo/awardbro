import { testDb } from "../src/test/integration/db";
import { createShow, expect, test } from "./show";

test.afterAll(async () => {
  await testDb.$disconnect();
});

test("the manage page asks anyone but the host for the password", async ({
  visit,
}) => {
  const host = await visit();
  const code = await createShow(host, {
    name: "Office Awards",
    password: "stapler",
  });

  const guest = await visit();
  await guest.goto(`/manage/${code}`);
  await expect(guest.getByText("Password Required")).toBeVisible();
  await expect(
    guest.getByRole("heading", { name: "Office Awards" }),
  ).toHaveCount(0);

  const password = guest.getByLabel("Password");
  const submit = guest.getByRole("button", { name: "Access Management" });
  await password.fill("wrong");
  await submit.click();
  await expect(guest.getByText("Invalid password")).toBeVisible();
  await expect(guest.getByText("Password Required")).toBeVisible();

  await password.fill("stapler");
  await submit.click();
  await expect(
    guest.getByRole("heading", { name: "Office Awards", level: 1 }),
  ).toBeVisible();
  await expect(
    guest.getByRole("button", { name: "Add Category" }),
  ).toBeVisible();
});

test("a show without a password opens straight to the manage page", async ({
  visit,
}) => {
  const host = await visit();
  const code = await createShow(host, {
    name: "Old Awards",
    password: "temporary",
  });
  // Only shows from before passwords were required have none
  await testDb.session.update({ where: { code }, data: { password: null } });

  const guest = await visit();
  await guest.goto(`/manage/${code}`);
  await expect(
    guest.getByRole("heading", { name: "Old Awards", level: 1 }),
  ).toBeVisible();
  await expect(guest.getByText("Password Required")).toHaveCount(0);
});
