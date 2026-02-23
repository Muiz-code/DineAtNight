import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export const FROM =
  `Dine At Night <${process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"}>`;

export const ADMIN_EMAIL =
  process.env.RESEND_ADMIN_EMAIL ?? "hello@dineatnight.com";
