import { z } from "zod";
import careerData from "../../rules/career-model.json";
import { experienceMonths } from "./career";
export const palmSchema = z.object({
  source: z.enum(["demo", "manual", "none"]),
  features: z.record(
    z
      .string()
      .regex(
        /^(heart_line_(length|curve|depth|branch_count)|head_line_(length|angle|curve|separation)|life_line_(length|curve|depth|break_count)|fate_line_(presence|strength|break_count)|palm_ratio|finger_ratio|thumb_angle|finger_spacing)$/,
      ),
    z.number().min(0).max(1),
  ),
});
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "유효한 날짜를 입력하세요.",
  );
export const profileSchema = z
  .object({
    asOf: date,
    fullName: z.string().trim().min(1).max(80).default("상담자"),
    displayName: z.string().trim().min(1).max(40).default("상담자"),
    speechMode: z.enum(["DIRECT", "POLITE"]).default("DIRECT"),
    occupationCategory: z.string().max(50).optional(),
    occupationCode: z.string().max(50).optional(),
    specialtyCode: z.string().max(50).optional(),
    customOccupation: z.string().trim().max(80).optional(),
    careerStartDate: date.or(z.literal("")).optional(),
    rawTitle: z.string().max(80).optional(),
    normalizedRole: z
      .enum([
        "ENTRY",
        "INDEPENDENT_CONTRIBUTOR",
        "KEY_CONTRIBUTOR",
        "LEAD",
        "TEAM_MANAGER",
        "ORG_LEADER",
        "EXECUTIVE_BUSINESS",
        "NOT_APPLICABLE",
      ])
      .optional(),
    managementExperience: z
      .enum([
        "NONE",
        "PEER_MENTORING",
        "PROJECT_LEAD",
        "TEAM_2_5",
        "TEAM_6_15",
        "ORG_16_PLUS",
        "MULTI_TEAM",
      ])
      .optional(),
    preferredTrack: z.enum(["MANAGEMENT", "EXPERT", "HYBRID"]).optional(),
    hiringExperience: z.boolean().optional(),
    evaluationExperience: z.boolean().optional(),
    budgetResponsibility: z.boolean().optional(),
    projectOwnership: z.boolean().optional(),
    birthDate: date,
    birthTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .or(z.literal("")),
    gender: z.enum(["female", "male", "unspecified"]),
    status: z.enum([
      "employed",
      "unemployed",
      "student",
      "business",
      "freelance",
    ]),
    occupation: z.string().min(1).max(40),
    jobTitle: z.string().max(80),
    education: z.enum(["school", "college", "university", "graduate"]),
    incomeBand: z.string().max(30),
    experienceYears: z.number().min(0).max(65),
    level: z.number().int().min(1).max(5),
    managementYears: z.number().min(0).max(50),
    visibility: z.number().min(0).max(10),
    network: z.number().min(0).max(10),
    learningHours: z.number().min(0).max(40),
    runwayMonths: z.number().min(0).max(60),
    businessInterest: z.number().min(0).max(10),
    concern: z.enum([
      "직업선택",
      "이직",
      "승진",
      "창업",
      "퇴직",
      "소득",
      "커리어 전환",
    ]),
    palm: palmSchema,
    selfRatings: z.record(z.string(), z.number().min(0).max(100)),
  })
  .superRefine((p, ctx) => {
    if (
      p.specialtyCode &&
      !careerData.occupations.some((o) => o.specialtyCode === p.specialtyCode)
    )
      ctx.addIssue({
        code: "custom",
        path: ["specialtyCode"],
        message: "목록의 직무 또는 기타 / 직접 입력을 선택하세요.",
      });
    if (
      p.careerStartDate &&
      (p.careerStartDate > p.asOf || p.careerStartDate < p.birthDate)
    )
      ctx.addIssue({
        code: "custom",
        path: ["careerStartDate"],
        message: "커리어 시작일을 확인하세요.",
      });
    const age = ageAt(p.birthDate, p.asOf);
    if (age < 18 || age > 85)
      ctx.addIssue({
        code: "custom",
        path: ["birthDate"],
        message: "18~85세 범위에서 이용할 수 있습니다.",
      });
    const experience = p.careerStartDate
      ? experienceMonths(p.careerStartDate, p.asOf) / 12
      : p.experienceYears;
    if (
      experience > age - 14 ||
      (!p.managementExperience && p.managementYears > experience)
    )
      ctx.addIssue({
        code: "custom",
        path: ["experienceYears"],
        message: "나이와 경력/관리 경력을 확인하세요.",
      });
  });
export type Profile = z.infer<typeof profileSchema>;
export function ageAt(birth: string, asOf: string) {
  const b = new Date(birth + "T00:00:00Z"),
    a = new Date(asOf + "T00:00:00Z");
  return (
    a.getUTCFullYear() -
    b.getUTCFullYear() -
    (a.getUTCMonth() < b.getUTCMonth() ||
    (a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() < b.getUTCDate())
      ? 1
      : 0)
  );
}
export type Condition = { field: string; op: string; value: unknown };
export type Expression = {
  all?: Expression[];
  any?: Expression[];
  not?: Expression;
  field?: string;
  op?: string;
  value?: unknown;
};
export type Rule = {
  id: string;
  priority: number;
  when: Expression;
  actionIds: string[];
  ceiling: number | null;
  templateId: string;
};
export type Scores = Record<string, number>;
