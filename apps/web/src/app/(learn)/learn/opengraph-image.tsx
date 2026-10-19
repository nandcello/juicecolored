import { learningSocialImage, socialImageSize } from "#/components/learn/social-image";

export const alt =
  "JuiceColored — A little more understanding. Interactive field guides to good software.";
export const size = socialImageSize;
export const contentType = "image/png";

export default function Image() {
  return learningSocialImage("learn");
}
