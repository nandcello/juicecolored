"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";

import { convexMessage } from "../lib/backend-errors";
import { fetchQuery, fetchMutation, fetchAction } from "../lib/convex-read";
import { api } from "@personal/convex";
import type { Id } from "@personal/convex/dataModel";
import {
  requireAdmin,
  AdminSessionError,
  issueSession,
  authConfigured,
  COOKIE,
  cookieOptions,
} from "../lib/auth";
import { PUBLIC_TAG, convexOptions } from "../lib/data";
import { fieldErrors, readContent, formText } from "../lib/forms";
import type { FormState } from "../lib/forms";
function safeError(error: unknown) {
  if (error instanceof AdminSessionError) return error.message;
  return (
    convexMessage(error) ??
    "The request could not be completed. Your entered values are kept; please retry."
  );
}
export async function login(_previous: FormState, form: FormData): Promise<FormState> {
  if (!authConfigured())
    return { error: "Owner sign-in is not configured. See the CANCELDT setup guide." };
  const password = formText(form, "password");
  if (!password || password.length > 256) return { error: "Enter your CANCELDT admin passphrase." };
  try {
    if (
      !(await fetchAction(
        api.canceldt.login.verify,
        {
          secret: process.env.CANCELDT_LOGIN_SECRET!,
          password,
        },
        convexOptions(),
      ))
    )
      return { error: "Passphrase not recognized." };
    const token = await issueSession();
    await fetchQuery(api.canceldt.admin.permission, {}, { ...convexOptions(), token });
    (await cookies()).set(COOKIE, token, cookieOptions());
  } catch (error) {
    return {
      error:
        convexMessage(error) ??
        "The sign-in service could not be reached. Please retry; this does not mean your passphrase is wrong.",
    };
  }
  redirect(
    new URL("/canceldt/admin", process.env.CANCELDT_PUBLIC_ORIGIN ?? "https://juicecolored.com")
      .href,
  );
}
export async function logout() {
  (await cookies()).delete({ name: COOKIE, path: "/canceldt" });
  redirect(
    new URL("/canceldt/admin", process.env.CANCELDT_PUBLIC_ORIGIN ?? "https://juicecolored.com")
      .href,
  );
}
export async function saveSubject(previous: FormState, form: FormData): Promise<FormState> {
  const retained = {
    id: previous.id,
    revision: previous.revision,
    publicationState: previous.publicationState,
    saved: previous.saved,
  };
  try {
    const token = await requireAdmin();
    const data = readContent(form),
      fields = fieldErrors(data);
    if (Object.keys(fields).length)
      return { ...retained, fields, error: "Check the marked fields." };
    const publicationState = formText(form, "intent") || formText(form, "publicationState");
    if (
      publicationState !== "draft" &&
      publicationState !== "published" &&
      publicationState !== "archived"
    )
      return { ...retained, error: "Choose a publication state." };
    if (publicationState === "archived" && form.get("confirmArchive") !== "yes")
      return { ...retained, error: "Confirm archiving before saving." };
    const id = await fetchMutation(
      api.canceldt.admin.save,
      {
        ...data,
        publicationState,
        ...(form.get("id")
          ? {
              id: formText(form, "id") as Id<"canceldtSubjects">,
              revision: Number(form.get("revision")),
            }
          : {}),
      },
      { ...convexOptions(), token },
    );
    updateTag(PUBLIC_TAG);
    // The committed revision is deterministic; a second network read must not
    // turn a successful create into an apparent failure that gets retried.
    return {
      success: true,
      saved: data,
      id,
      revision: form.get("id") ? Number(form.get("revision")) + 1 : 1,
      publicationState,
    };
  } catch (error) {
    return {
      ...retained,
      error: safeError(error),
      sessionExpired: error instanceof AdminSessionError,
    };
  }
}
export async function moderateReport(_previous: FormState, form: FormData): Promise<FormState> {
  try {
    const token = await requireAdmin();
    const data = readContent(form),
      decision = form.get("intent") === "reject" ? "reject" : "approve";
    const fields = fieldErrors(data);
    if (decision === "approve" && Object.keys(fields).length)
      return { fields, error: "Check the marked fields." };
    if (decision === "approve" && form.get("confirmPublish") !== "yes")
      return { error: "Confirm that you intend to publish this report." };
    const id = await fetchMutation(
      api.canceldt.admin.moderate,
      {
        ...data,
        id: formText(form, "reportId") as Id<"canceldtReports">,
        decision,
        ...(form.get("targetId")
          ? {
              targetId: formText(form, "targetId") as Id<"canceldtSubjects">,
              targetRevision: Number(form.get("targetRevision")),
            }
          : {}),
      },
      { ...convexOptions(), token },
    );
    updateTag(PUBLIC_TAG);
    return { success: true, id: id ?? undefined };
  } catch (error) {
    return { error: safeError(error) };
  }
}
export async function submitReport(_previous: FormState, form: FormData): Promise<FormState> {
  try {
    const data = readContent(form),
      fields = fieldErrors(data);
    if (Object.keys(fields).length) return { fields, error: "Check the marked fields." };
    await fetchAction(
      api.canceldt.reports.submit,
      {
        ...data,
        token: formText(form, "cf-turnstile-response"),
        submissionId: formText(form, "submissionId"),
        website: formText(form, "website"),
      },
      convexOptions(),
    );
    return { success: true };
  } catch (error) {
    return { error: safeError(error) };
  }
}
