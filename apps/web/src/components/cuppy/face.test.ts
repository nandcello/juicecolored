import { describe, expect, it } from "vitest";

import { beatsFor } from "./choreography";
import { blinkAt, BOTTOM_SLOP, browFlashAt, faceAt, type Expression, type FacePose } from "./face";

const HEIGHT = 844;
const MAX = 6200;
const beats = beatsFor(HEIGHT);
const ORDER: Expression[] = [
  "rest",
  "anticipate",
  "contact",
  "scoop",
  "lift",
  "curious",
  "impressed",
  "final",
];

describe("Cuppy's face", () => {
  it("starts cool behind the glasses and lands on one held final reaction", () => {
    const rest = faceAt(0, beats, MAX);
    expect(rest.expression).toBe("rest");
    expect(rest.pose.drop).toBe(0);
    expect(rest.pose.smirk).toBe(1);
    // Eyes squinted behind the shades.
    expect(rest.pose.squint).toBe(1);
    expect(rest.idle).toBe(1);

    const final = faceAt(MAX, beats, MAX);
    expect(final.expression).toBe("final");
    // A bright, proud smile, eyes back on the viewer with a catch-light.
    expect(final.pose.smile).toBe(1);
    expect(final.pose.shine).toBe(1);
    expect(final.pose.gaze).toBeLessThan(0.5);
    // Nothing idle plays at the bottom, including inside the rounding slop.
    expect(final.idle).toBe(0);
    expect(faceAt(MAX - BOTTOM_SLOP, beats, MAX).idle).toBe(0);
    expect(faceAt(MAX - BOTTOM_SLOP, beats, MAX).pose).toEqual(final.pose);
    // Past the end (overscroll) it is the same pose.
    expect(faceAt(MAX + 400, beats, MAX).pose).toEqual(final.pose);
  });

  it("looks up and tips the glasses at spoon contact, then perks them once at the scoop", () => {
    const contact = faceAt(beats.dig, beats, MAX);
    expect(contact.expression).toBe("contact");
    expect(contact.pose.gaze).toBe(1);
    expect(contact.pose.lid).toBe(0);
    expect(contact.pose.drop).toBeGreaterThan(60);
    expect(contact.pose.tip).toBeGreaterThan(0.4);
    const scoop = faceAt(beats.cradle, beats, MAX).pose;
    const lift = faceAt(beats.anchor, beats, MAX).pose;
    // Up and tilted the other way at the scoop, settled again by the lift.
    expect(scoop.drop).toBeLessThan(contact.pose.drop - 10);
    expect(Math.sign(scoop.tilt)).not.toBe(Math.sign(contact.pose.tilt));
    expect(lift.drop).toBeGreaterThan(scoop.drop + 10);
  });

  it("stays wholesome: round open eyes and a closed smile until the final", () => {
    const landing = beats.anchor + (MAX - BOTTOM_SLOP - beats.anchor) * 0.88;
    for (let s = beats.dig; s <= landing; s += 10) {
      const { pose } = faceAt(s, beats, MAX);
      // No half-lids, no shrinking pupils, no open mouth or teeth while it watches.
      expect(pose.lid, `lid at ${s}`).toBe(0);
      expect(pose.pupil, `pupil at ${s}`).toBe(1);
      expect(pose.open, `open at ${s}`).toBe(0);
      expect(pose.teeth, `teeth at ${s}`).toBe(0);
      expect(pose.smile, `smile at ${s}`).toBeGreaterThan(0.5);
      expect(pose.gaze, `gaze at ${s}`).toBe(1);
    }
    // The only opening is the final beaming smile, and it stays small.
    expect(faceAt(MAX, beats, MAX).pose.open).toBeLessThanOrEqual(0.3);
  });

  it("plays the beats in order on the way down and retraces them on the way up", () => {
    const down: Expression[] = [];
    const poses: FacePose[] = [];
    for (let s = 0; s <= MAX; s += 4) {
      const { expression, pose } = faceAt(s, beats, MAX);
      if (down.at(-1) !== expression) down.push(expression);
      poses.push(pose);
    }
    expect(down).toEqual(ORDER);
    // Scrolling back reads the same function: every pose matches exactly.
    let k = poses.length - 1;
    for (let s = Math.floor(MAX / 4) * 4; s >= 0; s -= 4, k--) {
      expect(faceAt(s, beats, MAX).pose).toEqual(poses[k]);
    }
    expect(faceAt(0, beats, MAX).expression).toBe("rest");
  });

  it("never jumps between neighbouring scroll positions", () => {
    let previous = faceAt(0, beats, MAX).pose;
    for (let s = 1; s <= MAX; s++) {
      const pose = faceAt(s, beats, MAX).pose;
      // Design units move under 2.5 per px; normalised amounts under 2% per px.
      expect(Math.abs(pose.drop - previous.drop), `drop at ${s}`).toBeLessThan(2.5);
      expect(Math.abs(pose.brow - previous.brow), `brow at ${s}`).toBeLessThan(2.5);
      for (const field of [
        "eye",
        "open",
        "teeth",
        "smile",
        "lid",
        "gaze",
        "cock",
        "tilt",
      ] as const) {
        expect(Math.abs(pose[field] - previous[field]), `${field} at ${s}`).toBeLessThan(0.02);
      }
      previous = pose;
    }
  });

  it("lifts one brow higher as the strand keeps going", () => {
    let cock = 0;
    let width = 0;
    // Up to the landing, where both brows go up for the proud final.
    const landing = beats.anchor + (MAX - BOTTOM_SLOP - beats.anchor) * 0.88;
    for (let s = beats.anchor; s <= landing; s += 10) {
      const { pose } = faceAt(s, beats, MAX);
      expect(pose.cock).toBeGreaterThanOrEqual(cock);
      expect(pose.width).toBeGreaterThanOrEqual(width - 1e-9);
      cock = pose.cock;
      width = pose.width;
    }
    const early = faceAt(beats.anchor + (MAX - beats.anchor) * 0.15, beats, MAX).pose;
    const late = faceAt(beats.anchor + (MAX - beats.anchor) * 0.85, beats, MAX).pose;
    expect(late.cock - early.cock).toBeGreaterThan(0.6);
    // The final evens the brows out and raises both.
    const final = faceAt(MAX, beats, MAX).pose;
    expect(final.cock).toBe(0);
    expect(final.brow).toBeGreaterThan(late.brow);
  });

  it("keeps idle life everywhere except the landing", () => {
    expect(faceAt(beats.anchor + (MAX - beats.anchor) * 0.8, beats, MAX).idle).toBe(1);
    const landing = faceAt(beats.anchor + (MAX - beats.anchor) * 0.95, beats, MAX).idle;
    expect(landing).toBeGreaterThan(0);
    expect(landing).toBeLessThan(1);
  });

  it("blinks and flashes a brow from a deterministic clock", () => {
    expect(blinkAt(0)).toBe(0);
    expect(browFlashAt(0)).toBe(0);
    let blinks = 0;
    let wasClosed = false;
    for (let t = 0; t < 42; t += 1 / 120) {
      const closed = blinkAt(t) > 0.9;
      if (closed && !wasClosed) blinks++;
      wasClosed = closed;
    }
    expect(blinks).toBeGreaterThanOrEqual(8);
    expect(blinks).toBeLessThanOrEqual(11);
  });
});
