// The three flavors visible on cuppyicecream.com. Descriptions are concept copy
// written for this page, not product, ingredient, or nutrition claims.

export const CUPPY_INSTAGRAM_URL = "https://www.instagram.com/cuppyicecream/";

export const FLAVOR_IDS = ["vanilla", "chocolate", "salted-caramel"] as const;

export type FlavorId = (typeof FLAVOR_IDS)[number];

export type Flavor = {
  id: FlavorId;
  name: string;
  line: string;
  /** Section field and chip fill, from the official palette. */
  field: string;
  /** Text on that field, chosen for AA contrast. */
  ink: string;
  /** Soft-serve base color for the 3D swirl. */
  cream: string;
  /** Lighter sheen tint for the swirl's soft highlights. */
  sheen: string;
  posterAlt: string;
};

export const FLAVORS: Record<FlavorId, Flavor> = {
  vanilla: {
    id: "vanilla",
    name: "Vanilla",
    line: "The quiet one. Pale, mellow, and the clearest way to watch the pull.",
    field: "#F2E6D2",
    ink: "#17131A",
    cream: "#F4E4C4",
    sheen: "#FFF7E8",
    posterAlt:
      "An original 3D render of a Cuppy paper cup, printed with pixel sunglasses, topped with a tall vanilla soft-serve swirl.",
  },
  chocolate: {
    id: "chocolate",
    name: "Chocolate",
    line: "Dark, deep, a little dramatic. Every lift leaves a ribbon behind.",
    field: "#58362E",
    ink: "#F2E6D2",
    cream: "#6B4131",
    sheen: "#B88468",
    posterAlt:
      "An original 3D render of a Cuppy paper cup, printed with pixel sunglasses, topped with a tall chocolate soft-serve swirl.",
  },
  "salted-caramel": {
    id: "salted-caramel",
    name: "Salted Caramel",
    line: "Golden, a touch salty, and very sure of itself. Takes the long way up.",
    field: "#D59D58",
    ink: "#17131A",
    cream: "#C8893F",
    sheen: "#F4CB8A",
    posterAlt:
      "An original 3D render of a Cuppy paper cup, printed with pixel sunglasses, topped with a tall salted caramel soft-serve swirl.",
  },
};

export function isFlavorId(value: string): value is FlavorId {
  return (FLAVOR_IDS as readonly string[]).includes(value);
}
