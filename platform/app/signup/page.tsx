import Link from "next/link";
import { Suspense } from "react";
import AuthForm from "../AuthForm";

export const metadata = { title: "Create your account · New Riyadh Media" };

export default function SignupPage() {
  return (
    <div className="auth">
      <div className="auth__panel">
        <Link href="/" className="auth__brand"><b>New Riyadh Media</b></Link>
        <span className="eyebrow">[ Get started ]</span>
        <h1 className="display" style={{ fontSize: "clamp(30px, 4vw, 46px)" }}>Create your account.</h1>
        <p className="lede">Set up your brand once. Your AI strategist learns it and runs with it.</p>
        <Suspense fallback={<div className="auth__form" />}>
          <AuthForm mode="signup" />
        </Suspense>
        <p className="auth__alt">Already have an account? <Link href="/login">Sign in</Link></p>
      </div>
      <div className="auth__aside" aria-hidden="true">
        <div className="auth__aside-inner">
          <span className="eyebrow">[ The marketing platform ]</span>
          <h2 className="display">From a blank page to a month of content, in an afternoon.</h2>
        </div>
      </div>
    </div>
  );
}
