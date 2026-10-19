import { learningSocialImage, socialImageSize } from "#/components/learn/social-image";

export const alt =
  "Inside pstack — Skills, principles and playbooks. Understand, build, verify. A JuiceColored field guide.";
export const size = socialImageSize;
export const contentType = "image/png";

export default function Image() {
  return learningSocialImage("pstack");
}
