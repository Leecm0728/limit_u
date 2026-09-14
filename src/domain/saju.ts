import { Solar } from "lunar-typescript";
import type { Profile } from "./model";
export function calculateSaju(p: Profile) {
  const [y, m, d] = p.birthDate.split("-").map(Number),
    [h, min] = (p.birthTime || "12:00").split(":").map(Number);
  const eight = Solar.fromYmdHms(y, m, d, h, min, 0).getLunar().getEightChar();
  const pillars = [
    eight.getYear(),
    eight.getMonth(),
    eight.getDay(),
    ...(p.birthTime ? [eight.getTime()] : []),
  ];
  const elements = [
    eight.getYearWuXing(),
    eight.getMonthWuXing(),
    eight.getDayWuXing(),
    ...(p.birthTime ? [eight.getTimeWuXing()] : []),
  ].join("");
  const features = Object.fromEntries(
    Object.entries({
      wood: "木",
      fire: "火",
      earth: "土",
      metal: "金",
      water: "水",
    }).map(([key, char]) => [
      key,
      [...elements].filter((c) => c === char).length / elements.length,
    ]),
  );
  return {
    pillars,
    features,
    method: "lunar-typescript 1.8.6 / civil-time approximation",
    timeKnown: !!p.birthTime,
    limitations:
      "양력·입력 현지시 기준. 한국 진태양시·역사적 서머타임 및 절기 경계 보정은 미지원. 경계 출생은 별도 검증이 필요합니다.",
  };
}
