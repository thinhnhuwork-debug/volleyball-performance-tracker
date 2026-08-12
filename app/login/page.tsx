"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "../../components/auth-provider";
import { createBrowserClient } from "../../lib/supabase/client";

export default function LoginPage() {
  const { configured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const supabase = createBrowserClient();
    if (!supabase) {
      setError("Supabase chưa được cấu hình cho môi trường này.");
      return;
    }

    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setSubmitting(false);
    if (signInError) {
      setError(signInError.message === "Invalid login credentials" ? "Email hoặc mật khẩu không đúng." : signInError.message);
    }
  }

  return <main className="login-page"><section className="login-card">
    <div className="login-brand"><span className="brand-mark">V</span><span>Volley<strong>Metrics</strong></span></div>
    <div className="login-heading"><span className="eyebrow">HVC VOLLEYBALL CLUB</span><h1>Đăng nhập</h1><p>Dùng tài khoản đã được tạo trong Supabase để tiếp tục.</p></div>
    <form onSubmit={handleSubmit} className="login-form">
      <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="ban@hvc.vn" required/></div>
      <div className="field"><label htmlFor="password">Mật khẩu / Password</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)} placeholder="Nhập mật khẩu" required/></div>
      {error && <div className="login-error" role="alert">{error}</div>}
      {!configured && <div className="login-error" role="alert">Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_ANON_KEY.</div>}
      <button className="primary-btn login-submit" type="submit" disabled={submitting||!configured}>{submitting?"Đang đăng nhập…":"Đăng nhập / Sign in"}</button>
    </form>
  </section></main>;
}
