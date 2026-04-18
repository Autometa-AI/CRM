"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const AUTH_COOKIE = "autometa-auth";
const ONE_WEEK = 60 * 60 * 24 * 7;

export async function login(form: FormData) {
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const from = String(form.get("from") ?? "/") || "/";

  const expectedUser = process.env.AUTH_USERNAME ?? "admin";
  const expectedPass = process.env.AUTH_PASSWORD ?? "AutometaAI@2026";

  if (username !== expectedUser || password !== expectedPass) {
    redirect(`/login?error=${encodeURIComponent("Invalid username or password")}&from=${encodeURIComponent(from)}`);
  }

  const secret = process.env.SESSION_SECRET ?? "autometa-crm-default-secret-change-in-production-2026";

  cookies().set(AUTH_COOKIE, secret, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_WEEK,
  });

  const safe = from.startsWith("/") && !from.startsWith("//") ? from : "/";
  redirect(safe);
}

export async function logout() {
  cookies().delete(AUTH_COOKIE);
  redirect("/login");
}
