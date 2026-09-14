"use client";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import demos from "../../rules/demos.json";

import { profileSchema, type Profile } from "@/domain/model";
import { PalmInput } from "./palm";
import { browserDb } from "@/lib/supabase";
import type { Analysis } from "@/domain/engine";
import {
  careerModel,
  normalizeCareer,
  occupationFor,
  experienceMonths,
  experienceLabel,
} from "@/domain/career";
import { SearchSelect } from "./occupation-select";
import { AnalysisRitual } from "./analysis-ritual";
const steps = [
  "기본정보",
  "현재 상황",
  "커리어",
  "고민과 증거",
  "손금",
  "분석",
];
export function Onboarding() {
  const params = useSearchParams(),
    router = useRouter();
  const initial = structuredInitial(
    profileSchema.parse(
      demos.find((d) => d.id === params.get("case")) ?? {
        ...demos[0],
        asOf: new Date().toLocaleDateString("sv-SE"),
      },
    ),
  );
  const { register, handleSubmit, getValues, reset, setValue, control } =
    useForm<Profile>({ defaultValues: initial });
  const [step, setStep] = useState(0),
    [error, setError] = useState(""),
    [progress, setProgress] = useState<string[]>([]),
    [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState<Analysis | null>(null);
  const current = useWatch({ control });
  const palm = useWatch({ control, name: "palm" });
  const number = (key: keyof Profile) => register(key, { valueAsNumber: true });
  function setStartMonth(month: string) {
    const date = month ? `${month}-01` : "";
    setValue("careerStartDate", date);
    setValue(
      "experienceYears",
      date ? experienceMonths(date, getValues("asOf")) / 12 : 0,
    );
  }
  async function submit(p: Profile) {
    setError("");
    const parsed = profileSchema.safeParse(p);
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(" "));
      return;
    }
    if (p.palm.source === "manual" && !Object.keys(p.palm.features).length) {
      setError("손금 선을 표시하거나 손금 없이 진행을 선택하세요.");
      return;
    }
    setBusy(true);
    setProgress(["입력 데이터 검증 완료", "손금 특징 확인 완료"]);
    try {
      const db = browserDb();
      const session = db ? (await db.auth.getSession()).data.session : null;
      setProgress((v) => [
        ...v,
        "사주 · Trait · 경로 · Critical Point 계산 요청",
      ]);
      const response = await fetch("/api/analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify(parsed.data),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setProgress((v) => [...v, "리포트 생성 완료"]);
      sessionStorage.setItem("limit-u-report", JSON.stringify(data.result));
      setCompleted(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석에 실패했습니다.");
      setBusy(false);
    }
  }
  function next() {
    const p = getValues();
    const fields =
      [
        [
          "birthDate",
          "birthTime",
          "gender",
          "asOf",
          "fullName",
          "displayName",
          "speechMode",
        ],
        ["status"],
        [
          "occupation",
          "experienceYears",
          "managementYears",
          "level",
          "education",
          "jobTitle",
          "incomeBand",
          "careerStartDate",
          "normalizedRole",
          "managementExperience",
          "customOccupation",
        ],
        [
          "visibility",
          "network",
          "learningHours",
          "runwayMonths",
          "businessInterest",
          "concern",
        ],
      ][step] ?? [];
    const result = profileSchema.safeParse(p);
    const issues = result.success
      ? []
      : result.error.issues.filter((i) => fields.includes(String(i.path[0])));
    if (issues.length) {
      setError(issues.map((i) => i.message).join(" "));
      return;
    }
    setError("");
    setStep((s) => s + 1);
  }
  if (completed)
    return (
      <AnalysisRitual
        report={completed}
        onComplete={() => router.push("/dashboard")}
      />
    );
  return (
    <main className="workspace onboarding">
      <aside>
        <p className="eyebrow">LIMIT U / 상담 접수</p>
        <h1>
          기록부터
          <br />
          펼쳐봅시다.
        </h1>
        <p className="muted">
          완벽한 답보다 솔직한 답이
          <br />더 쓸모 있는 결과를 만듭니다.
        </p>
        <ol className="steps">
          {steps.map((label, i) => (
            <li
              key={label}
              className={i === step ? "active" : i < step ? "done" : ""}
            >
              <span>
                {i < step ? (
                  <Check size={14} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              {label}
            </li>
          ))}
        </ol>
        <div className="demo-select">
          <small>DEMO SCENARIOS</small>
          {demos.map((d) => (
            <button
              type="button"
              key={d.id}
              onClick={() => {
                reset(structuredInitial(profileSchema.parse(d)));
                setStep(0);
                setError("");
              }}
            >
              CASE {d.id} <span>{d.name} ↗</span>
            </button>
          ))}
        </div>
      </aside>
      <section className="form-panel">
        <div className="form-top">
          <span>0{step + 1} / 06</span>
          <span>PRIVATE BY DEFAULT</span>
        </div>
        <h2>{steps[step]}</h2>
        <form onSubmit={handleSubmit(submit)}>
          {step === 0 && (
            <>
              <label>
                이름
                <input {...register("fullName")} placeholder="김피티" />
              </label>
              <label>
                뭐라고 부르면 될까요?
                <input {...register("displayName")} placeholder="피티" />
                <small>
                  이름에서 성을 자동으로 떼지 않습니다. 원하는 호칭을 직접
                  적어주세요.
                </small>
              </label>
              <label>
                판정 기록의 말투
                <select {...register("speechMode")}>
                  <option value="DIRECT">직접적으로 이야기하기</option>
                  <option value="POLITE">존댓말로 이야기하기</option>
                </select>
              </label>
              <label>
                생년월일 (양력)
                <input type="date" {...register("birthDate")} />
              </label>
              <div className="form-grid">
                <label>
                  출생시간 (모르면 비워 두세요)
                  <input type="time" {...register("birthTime")} />
                </label>
                <label>
                  성별
                  <select {...register("gender")}>
                    <option value="unspecified">선택 안 함</option>
                    <option value="female">여성</option>
                    <option value="male">남성</option>
                  </select>
                </label>
              </div>
              <label>
                분석 기준일
                <input type="date" {...register("asOf")} />
              </label>
              <p className="muted">
                성별은 현재 커리어 점수에 영향을 주지 않습니다. 한국 현지 시각
                기준의 양력을 입력하세요.
              </p>
            </>
          )}
          {step === 1 && (
            <label>
              현재 어떤 상황인가요?
              <select {...register("status")}>
                <option value="employed">재직 중</option>
                <option value="unemployed">구직 / 무직</option>
                <option value="student">학생</option>
                <option value="business">사업 운영</option>
                <option value="freelance">프리랜서</option>
              </select>
            </label>
          )}
          {step === 2 && (
            <>
              <SearchSelect
                value={current.specialtyCode || "OTHER"}
                onChange={(fields) => {
                  for (const [key, value] of Object.entries(fields))
                    setValue(key as keyof Profile, value);
                }}
              />
              {current.specialtyCode === "OTHER" && (
                <label>
                  목록에 없는 직업
                  <input
                    {...register("customOccupation")}
                    placeholder="직업 / 세부 직무를 적어주세요"
                  />
                </label>
              )}
              <label>
                커리어 시작 시점
                <input
                  type="month"
                  value={current.careerStartDate?.slice(0, 7) || ""}
                  max={current.asOf?.slice(0, 7)}
                  onChange={(e) => setStartMonth(e.currentTarget.value)}
                  onInput={(e) => setStartMonth(e.currentTarget.value)}
                />
                <span aria-live="polite">
                  총 경력{" "}
                  {experienceLabel(
                    current.careerStartDate
                      ? experienceMonths(
                          current.careerStartDate,
                          current.asOf || initial.asOf,
                        )
                      : 0,
                  )}
                </span>
              </label>
              <label>
                회사 직급 (참고 기록)
                <input {...register("rawTitle")} placeholder="예: 선임매니저" />
              </label>
              <label>
                현재 실제로 어떤 역할을 하고 있나요?
                <select
                  {...register("normalizedRole")}
                  onChange={(e) => {
                    const role = e.target.value as NonNullable<
                      Profile["normalizedRole"]
                    >;
                    setValue("normalizedRole", role);
                    setValue("level", careerModel.roleStages[role]);
                  }}
                >
                  {Object.entries(careerModel.roleLabels).map(
                    ([code, label]) => (
                      <option value={code} key={code}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label>
                사람이나 프로젝트를 이끌어본 경험이 있나요?
                <select {...register("managementExperience")}>
                  {Object.entries(careerModel.managementLabels).map(
                    ([code, label]) => (
                      <option value={code} key={code}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <div className="form-grid">
                <label>
                  학력
                  <select {...register("education")}>
                    <option value="school">고졸 이하</option>
                    <option value="college">전문대</option>
                    <option value="university">대졸</option>
                    <option value="graduate">대학원</option>
                  </select>
                </label>
              </div>
              <label>
                연 소득 구간
                <select {...register("incomeBand")}>
                  {[
                    "소득 없음",
                    "3000 미만",
                    "3000-5000",
                    "5000-8000",
                    "8000 이상",
                    "응답 안 함",
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            </>
          )}
          {step === 3 && (
            <>
              <label>
                지금 가장 큰 고민
                <select {...register("concern")}>
                  {[
                    "직업선택",
                    "이직",
                    "승진",
                    "창업",
                    "퇴직",
                    "소득",
                    "커리어 전환",
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <div className="form-grid">
                {(
                  [
                    {
                      key: "visibility",
                      label: "외부 공개 성과 (0~10)",
                      max: 10,
                    },
                    { key: "network", label: "직무 네트워크 (0~10)", max: 10 },
                    { key: "learningHours", label: "주당 학습 시간", max: 40 },
                    {
                      key: "runwayMonths",
                      label: "생활비 여유 (개월)",
                      max: 60,
                    },
                    {
                      key: "businessInterest",
                      label: "창업 관심 (0~10)",
                      max: 10,
                    },
                  ] as const
                ).map((f) => (
                  <label key={f.key}>
                    {f.label}
                    <input
                      type="number"
                      min="0"
                      max={f.max}
                      {...number(f.key)}
                    />
                  </label>
                ))}
              </div>
            </>
          )}
          {step === 4 && (
            <PalmInput value={palm} onChange={(p) => setValue("palm", p)} />
          )}{" "}
          {step === 5 && (
            <>
              <div className="review">
                <p>입력한 정보로 세 가지 경로를 계산합니다.</p>
                <strong>Baseline / Improved / Aggressive</strong>
                <p>
                  현재와 개선 경로는 확정된 예측이 아닌, 행동 조건을 바꾼
                  시뮬레이션입니다.
                </p>
              </div>
              <ol className="progress-list" aria-live="polite">
                {progress.map((p) => (
                  <li key={p}>
                    <Check size={16} />
                    {p}
                  </li>
                ))}
              </ol>
            </>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
              {error.includes("로그인") && <a href="/auth"> 로그인하기 →</a>}
            </p>
          )}
          <div className="form-controls">
            {step > 0 && (
              <button
                type="button"
                disabled={busy}
                className="button secondary"
                onClick={() => setStep((s) => s - 1)}
              >
                <ArrowLeft size={16} /> 이전
              </button>
            )}
            {step < 5 ? (
              <button
                key="next"
                type="button"
                className="button primary"
                onClick={(event) => {
                  event.preventDefault();
                  next();
                }}
              >
                다음 <ArrowRight size={18} />
              </button>
            ) : (
              <button
                key="analyze"
                type="submit"
                disabled={busy}
                className="button primary"
              >
                {busy ? "분석 중…" : "내 경로 계산하기"}{" "}
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        </form>
      </section>
    </main>
  );
}
function structuredInitial(p: Profile): Profile {
  const c = normalizeCareer(p);
  const date = new Date(p.asOf + "T00:00:00Z");
  date.setUTCMonth(date.getUTCMonth() - c.experienceMonths);
  return {
    ...p,
    occupationCategory: c.occupationCategory,
    occupationCode: c.occupationCode,
    specialtyCode:
      c.specialtyCode || occupationFor(p.occupation)?.specialtyCode || "OTHER",
    normalizedRole: c.currentRole,
    managementExperience: c.managementExperience,
    careerStartDate:
      p.careerStartDate ??
      (c.experienceMonths ? date.toISOString().slice(0, 7) + "-01" : ""),
  };
}
