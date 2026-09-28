import type { Capability, Scene } from "@personal/jarvis/domain";
export type * from "@personal/jarvis/domain";

export const BUILTIN_SCENES: Scene[] = [
  {
    id: "unwind",
    name: "Unwind",
    description: "A little warmth. A slower pace.",
    mode: "white",
    kelvin: 2700,
    color: "#edba77",
    brightness: 35,
  },
  {
    id: "focus",
    name: "Focus",
    description: "Clear light for a clear mind.",
    mode: "white",
    kelvin: 5000,
    color: "#c4deca",
    brightness: 100,
  },
  {
    id: "after-hours",
    name: "After hours",
    description: "Let the evening find its color.",
    mode: "color",
    kelvin: 4000,
    color: "#b871ff",
    brightness: 30,
  },
  {
    id: "movie-night",
    name: "Movie night",
    description: "Settle in. Dim the world.",
    mode: "color",
    kelvin: 2700,
    color: "#ff7340",
    brightness: 15,
  },
];
export const INTEGRATIONS = [
  {
    id: "xiaomi",
    name: "Xiaomi Home",
    description: "Yeelight lights and Mi Smart Standing Fan 2, connected through Xiaomi Home.",
    capabilities: [
      "power",
      "brightness",
      "temperature",
      "color",
      "scenes",
      "effects",
      "timer",
    ] as Capability[],
  },
];
