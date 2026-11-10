"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { loginAction, signupAction } from "@/app/actions/auth";
import { initialState } from "@/app/actions/types";
import { FieldError, FormMessage } from "@/components/ui/FieldError";
import { SubmitButton } from "@/components/ui/SubmitButton";

type Mode = "login" | "signup";

const COPY = {
  login: { title: "Sign in to your monitors", sub: "Use the email your alerts go to.", cta: "sign in", pending: "signing in", alt: "/signup", altText: "No account? Create one" },
  signup: { title: "Create your account", sub: "Alerts go to this email. Takes 20 seconds.", cta: "create account", pending: "creating", alt: "/login", altText: "Have an account? Sign in" },
} as const;

export function AuthForm({ mode }: { mode: Mode }) {
  const [state, action] = useActionState(mode === "login" ? loginAction : signupAction, initialState);
  const [show, setShow] = useState(false);
  const c = COPY[mode];
  const e = state.errors ?? {};

  return (
    <div className="pane w-full max-w-[420px] p-5 md:p-6">
      <nav aria-label="Account" className="mb-4 grid grid-cols-2 border border-line-strong text-center">
        <Link href="/login" aria-current={mode === "login" ? "page" : undefined} className="py-1.5 text-fg-3 no-underline aria-[current=page]:bg-fg aria-[current=page]:text-bg">
          sign in
        </Link>
        <Link href="/signup" aria-current={mode === "signup" ? "page" : undefined} className="border-l border-line-strong py-1.5 text-fg-3 no-underline aria-[current=page]:bg-fg aria-[current=page]:text-bg">
          create account
        </Link>
      </nav>
      <h1 className="m-0 text-lg tracking-tight">{c.title}</h1>
      <p className="prose-text mt-1 mb-4 text-sm text-fg-3">{c.sub}</p>

      <form action={action} noValidate className="grid gap-4">
        <FormMessage message={state.message} ok={state.ok} />
        <div className="field">
          <label htmlFor="email" className="field-label">
            email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            placeholder="you@college.edu"
            defaultValue={state.values?.email ?? ""}
            aria-invalid={Boolean(e.email)}
            aria-describedby={e.email ? "email-err" : undefined}
            className="input"
          />
          <FieldError id="email-err" message={e.email} />
        </div>
        <div className="field">
          <label htmlFor="password" className="field-label">
            password
          </label>
          <div className="relative flex items-center">
            <input
              id="password"
              name="password"
              type={show ? "text" : "password"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={mode === "signup" ? 8 : undefined}
              aria-invalid={Boolean(e.password)}
              aria-describedby={e.password ? "password-err" : mode === "signup" ? "password-hint" : undefined}
              className="input pr-16"
            />
            <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show} aria-controls="password" className="btn btn-ghost btn-sm absolute right-1">
              {show ? "hide" : "show"}
            </button>
          </div>
          {mode === "signup" && !e.password ? (
            <span id="password-hint" className="field-hint">
              At least 8 characters.
            </span>
          ) : null}
          <FieldError id="password-err" message={e.password} />
        </div>
        <SubmitButton variant="primary" pendingLabel={c.pending}>
          {c.cta}
        </SubmitButton>
        <p className="prose-text m-0 text-xs text-fg-3">
          <Link href={c.alt} className="text-fg-2 underline-offset-2 hover:text-accent-ink">
            {c.altText}
          </Link>
        </p>
      </form>
    </div>
  );
}
