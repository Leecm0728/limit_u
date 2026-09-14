import type { ReactNode } from "react";
export function PaperSheet({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`paper-sheet paper-enter ${className}`}>
      {children}
    </section>
  );
}
export function DossierHeader({
  name,
  date,
  number,
}: {
  name: string;
  date: string;
  number: string;
}) {
  return (
    <header className="dossier-header">
      <div className="record-meta">
        <span>CASE NO. {number}</span>
        <span>{date}</span>
      </div>
      <strong>LIMIT U</strong>
      <span className="record-subtitle">個人判定記錄 · 개인 판정 기록</span>
      <div className="record-person">
        {name}
        <span>상담 기록 / 비공개</span>
      </div>
    </header>
  );
}
export function InkUnderline({ children }: { children: ReactNode }) {
  return (
    <span className="ink-underline">
      {children}
      <svg aria-hidden="true" viewBox="0 0 220 12" preserveAspectRatio="none">
        <path d="M2 6 C46 2,104 9,216 4" />
      </svg>
    </span>
  );
}
export function InkCircle({ children }: { children: ReactNode }) {
  return (
    <span className="ink-circle">
      {children}
      <svg aria-hidden="true" viewBox="0 0 210 80" preserveAspectRatio="none">
        <path d="M185 12 C142 -3,43 1,14 24 C-9 51,28 75,111 74 C194 77,224 40,185 12 C162 4,80 1,42 12" />
      </svg>
    </span>
  );
}
export function ExpertAnnotation({ children }: { children: ReactNode }) {
  return (
    <aside className="expert-annotation">
      <span aria-hidden="true">✓</span>
      {children}
    </aside>
  );
}
export function VerdictSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="verdict-section">
      <p className="record-label">{label}</p>
      {children}
    </section>
  );
}
export function ActionRecord({
  number,
  title,
  detail,
}: {
  number: number;
  title: string;
  detail: string;
}) {
  return (
    <article className="action-record">
      <span>{String(number).padStart(2, "0")}</span>
      <div>
        <h3>{title}</h3>
        <p>{detail}</p>
      </div>
    </article>
  );
}
