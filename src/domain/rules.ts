import type { Expression } from "./model";
export function matches(
  e: Expression,
  context: Record<string, unknown>,
): boolean {
  if (e.all) return e.all.every((c) => matches(c, context));
  if (e.any) return e.any.some((c) => matches(c, context));
  if (e.not) return !matches(e.not, context);
  const a = context[e.field ?? ""],
    b = e.value;
  if (a === undefined) return false;
  switch (e.op) {
    case "eq":
      return a === b;
    case "in":
      return Array.isArray(b) && b.includes(a);
    case "lt":
      return typeof a === "number" && typeof b === "number" && a < b;
    case "lte":
      return typeof a === "number" && typeof b === "number" && a <= b;
    case "gt":
      return typeof a === "number" && typeof b === "number" && a > b;
    case "gte":
      return typeof a === "number" && typeof b === "number" && a >= b;
    case "between":
      return (
        typeof a === "number" &&
        Array.isArray(b) &&
        b.length === 2 &&
        a >= b[0] &&
        a <= b[1]
      );
    default:
      return false;
  }
}
