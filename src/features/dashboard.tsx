"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Analysis } from "@/domain/engine";
import { VerdictDocument } from "./verdict-document";
import { browserDb } from "@/lib/supabase";
export function Dashboard() {
  const [report, setReport] = useState<Analysis | null>(null),
    [scenario, setScenario] = useState(0),
    [opened, setOpened] = useState(false),
    [paying, setPaying] = useState(false),
    [loaded, setLoaded] = useState(false),
    [message, setMessage] = useState(""),
    [history, setHistory] = useState<
      { id: string; data: Analysis; created_at: string }[]
    >([]);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const cached = sessionStorage.getItem("limit-u-report");
        const db = browserDb();
        if (cached && active) setReport(JSON.parse(cached));
        if (db) {
          const session = (await db.auth.getSession()).data.session;
          if (session) {
            const response = await fetch("/api/analysis", {
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            const data = await response.json();
            if (active && response.ok) {
              setHistory(data.reports);
              if (data.reports.length) setReport(data.reports[0].data);
            }
          }
        }
      } catch {
        if (active)
          setMessage("저장된 리포트를 읽지 못했습니다. 다시 분석해 주세요.");
      } finally {
        if (active) setLoaded(true);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);
  if (!loaded) return <main className="workspace">리포트 불러오는 중…</main>;
  if (!report)
    return (
      <main className="workspace empty">
        <p className="eyebrow">YOUR NEXT CHAPTER</p>
        <h1>아직 펼치지 않은 경로.</h1>
        <p>
          {message || "몇 가지 단서를 입력하면 당신의 리포트가 만들어집니다."}
        </p>
        <Link className="button primary" href="/onboarding">
          분석 시작 <ArrowRight size={18} />
        </Link>
      </main>
    );

  async function checkout() {
    if (paying) return;
    setPaying(true);
    try {
      const db = browserDb(),
        session = db ? (await db.auth.getSession()).data.session : null;
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({ productId: "career-full" }),
      });
      const data = await response.json();
      if (
        response.ok &&
        data.receipt.provider === "mock" &&
        data.receipt.status === "simulated"
      )
        setOpened(true);
      setMessage(
        response.ok
          ? `${data.message} · ₩${data.receipt.amount.toLocaleString()}`
          : data.error,
      );
    } catch {
      setMessage("연결에 실패했습니다. 다시 시도하세요.");
    } finally {
      setPaying(false);
    }
  }
  function download() {
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "limit-u-report.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <main className="workspace dossier-desk">
      <div className="report-toolbar">
        <p className="eyebrow">접수 → 검토 → 판정</p>
        <div className="button-row">
          <button className="icon-button" onClick={download}>
            JSON 저장
          </button>
          <button className="icon-button" onClick={() => window.print()}>
            인쇄 / PDF
          </button>
          <Link href="/onboarding" className="icon-button">
            새 상담 →
          </Link>
        </div>
      </div>
      <VerdictDocument
        report={report}
        scenario={scenario}
        setScenario={setScenario}
        opened={opened}
        paying={paying}
        checkout={() => void checkout()}
      />
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      {history.length > 0 && (
        <section className="report-block">
          <h2>이전 상담 기록</h2>
          {history.map((h) => (
            <button
              className="history-item"
              key={h.id}
              onClick={() => {
                setReport(h.data);
                setScenario(0);
                setOpened(false);
                sessionStorage.setItem(
                  "limit-u-report",
                  JSON.stringify(h.data),
                );
              }}
            >
              {h.data.input.asOf} ·{" "}
              {h.data.input.jobTitle || h.data.input.occupation} →
            </button>
          ))}
        </section>
      )}
    </main>
  );
}
