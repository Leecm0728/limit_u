import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import "./records.css";
import "./fonts.css";
export const metadata: Metadata = {
  title: "LIMIT U — 당신의 다음 경로",
  description: "손금, 사주, 현재의 나. 데이터로 비교하는 세 가지 커리어 경로.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <header className="nav">
          <Link href="/" className="logo">
            LIMIT <span>U</span>
            <i>®</i>
          </Link>
          <nav>
            <Link href="/dashboard">내 리포트</Link>
            <Link href="/admin">엔진 탐색</Link>
            <Link href="/auth" className="nav-login">
              로그인 <span>↗</span>
            </Link>
          </nav>
        </header>
        {children}
        <footer>
          <Link href="/" className="logo">
            LIMIT <span>U</span>
          </Link>
          <p>
            전통적 사주·손금·성명 해석 체계를 데이터화한 엔터테인먼트 및
            자기성찰 목적의 콘텐츠입니다.
          </p>
          <small>© 2026 LIMIT U · Personal Destiny Engine</small>
        </footer>
      </body>
    </html>
  );
}
