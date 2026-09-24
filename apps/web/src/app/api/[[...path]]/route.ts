import { connection } from "next/server";
import { handleSpamRequest } from "#/server/spam/handler";

// A full batch can take five 10-second evaluation deadlines.
export const maxDuration = 60;

async function handler(request: Request) {
  await connection();
  return handleSpamRequest(request);
}

export {
  handler as GET,
  handler as HEAD,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
  handler as OPTIONS,
};
