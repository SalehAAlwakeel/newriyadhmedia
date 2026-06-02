import Link from "next/link";
import { Suspense } from "react";
import AuthForm from "../AuthForm";

export const metadata = { title: "Sign in · New Riyadh Media" };

export default function LoginPage() {
  return (
    <div className="auth">
      <div className="auth__panel">
        <Link href="/" className="auth__brand"><b>New Riyadh Media</b></Link>
        <span className="eyebrow">[ Welcome back ]</span>
        <h1 className="display" style={{ fontSize: "clamp(30px, 4vw, 46px)" }}>Sign in to your studio.</h1>
        <p className="lede">Your campaigns, calendar, brand kit and AI strategist — all in one place.</p>
        <Suspense fallback={<div className="auth__form" />}>
          <AuthForm mode="login" />
        </Suspense>
        <p className="auth__alt">New here? <Link href="/signup">Create an account</Link></p>
      </div>
      <div className="auth__aside" aria-hidden="true">
        <div className="auth__aside-inner">
          <span className="eyebrow">[ The marketing platform ]</span>
          <h2 className="display">Strategy, content and posting — on autopilot, with you in control.</h2>
        </div>
      </div>
    </div>
  );
}
