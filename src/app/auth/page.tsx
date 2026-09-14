"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { browserDb, configured } from "@/lib/supabase";
export default function Auth() {
  const router = useRouter();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [mode, setMode] = useState<"login" | "signup">("signup"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const db = browserDb();
    if (!db) return;
    setBusy(true);
    try {
      const result =
        mode === "signup"
          ? await db.auth.signUp({ email, password })
          : await db.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (result.data.session) router.push("/onboarding");
      else setMessage("확인 이메일을 보냈습니다. 이메일 인증 후 로그인하세요.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "인증에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="workspace auth-page">
      <p className="eyebrow">YOUR NEXT CHAPTER</p>
      <h1>
        당신의 다음을
        <br />
        기록하세요.
      </h1>
      {configured ? (
        <form onSubmit={submit}>
          <div className="segmented">
            <button
              type="button"
              aria-pressed={mode === "signup"}
              onClick={() => setMode("signup")}
            >
              회원가입
            </button>
            <button
              type="button"
              aria-pressed={mode === "login"}
              onClick={() => setMode("login")}
            >
              로그인
            </button>
          </div>
          <label>
            이메일
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            비밀번호
            <input
              type="password"
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button disabled={busy} className="button primary">
            {busy ? "처리 중…" : mode === "signup" ? "계정 만들기" : "로그인"}
          </button>
        </form>
      ) : (
        <div className="review">
          <p>현재 로컬 Demo Mode입니다.</p>
          <p>
            Supabase 연결 없이도 입력부터 전체 리포트까지 체험할 수 있습니다.
            데이터는 현재 브라우저 탭에 보관됩니다.
          </p>
          <Link className="button primary" href="/onboarding">
            Demo로 시작 →
          </Link>
        </div>
      )}
      {message && <p role="status">{message}</p>}
      {configured && (
        <button
          className="text-link"
          onClick={async () => {
            await browserDb()?.auth.signOut();
            sessionStorage.removeItem("limit-u-report");
            setMessage("로그아웃했습니다.");
          }}
        >
          로그아웃
        </button>
      )}
    </main>
  );
}
