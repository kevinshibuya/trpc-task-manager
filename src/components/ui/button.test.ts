import { describe, expect, it } from "vitest";

import { buttonVariants } from "./button";

const classes = (value: string) => value.split(/\s+/);

// A link styled as a button gets these classes as they are, with nothing to
// resolve two utilities that set the same property. The stylesheet would
// then pick the winner by its own order, not the variant's intent.
describe("buttonVariants", () => {
  it("gives the outline variant its border colour, not the base's transparent one", () => {
    const outline = classes(buttonVariants({ variant: "outline" }));

    expect(outline).toContain("border-border");
    expect(outline).not.toContain("border-transparent");
  });

  it("lets a size's corner radius replace the base's", () => {
    const small = classes(buttonVariants({ size: "icon-sm" }));

    expect(small).not.toContain("rounded-lg");
  });

  it("lets the caller's classes replace the variant's", () => {
    const round = classes(
      buttonVariants({ size: "icon", className: "rounded-full" }),
    );

    expect(round).toContain("rounded-full");
    expect(round).not.toContain("rounded-lg");
  });
});
