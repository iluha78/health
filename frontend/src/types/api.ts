export interface AuthSuccess {
  token: string;
}

export interface ApiError {
  error?: string;
  [key: string]: unknown;
}

export interface UserSummary {
  id: number;
  email: string;
  created_at?: string;
}

export interface ProfileTargets {
  user_id: number;
  sex: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity: string | null;
  kcal_goal: number | null;
  sfa_limit_g: number | null;
  fiber_goal_g: number | null;
}

export interface Lipid {
  id: number;
  dt: string;
  chol: number | null;
  hdl: number | null;
  ldl: number | null;
  trig: number | null;
  note: string | null;
}

export interface Food {
  id: number;
  name: string;
  kcal: number;
  protein_g: number | null;
  fat_g: number | null;
  sfa_g: number | null;
  carbs_g: number | null;
  fiber_g: number | null;
  soluble_fiber_g: number | null;
}

export interface DiaryItem {
  id: number;
  grams: number;
  note: string | null;
  food: Food | null;
}

export interface DiaryDay {
  date: string;
  items: DiaryItem[];
}

export const HEALTHINESS_VALUES = ["healthy", "balanced", "caution"] as const;
export type Healthiness = typeof HEALTHINESS_VALUES[number];

export interface PhotoAnalysis {
  title: string;
  description: string;
  estimated_calories: number | null;
  healthiness: Healthiness;
  reasoning: string;
  tips: string[];
}

export interface AdviceResponse {
  advice?: string;
  error?: string;
  [key: string]: unknown;
}

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantReply {
  reply?: string;
  error?: string;
  [key: string]: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toStringOrNull = (value: unknown): string | null => {
  if (typeof value === "string") {
    return value;
  }
  return value == null ? null : String(value);
};

export const isHealthiness = (value: unknown): value is Healthiness =>
  typeof value === "string" && HEALTHINESS_VALUES.includes(value as Healthiness);

export function normalizeLipids(value: unknown): Lipid[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map(item => {
      if (!isRecord(item)) {
        return null;
      }
      const id = toNumberOrNull(item.id);
      const dt = typeof item.dt === "string" ? item.dt : null;
      if (id === null || dt === null) {
        return null;
      }
      return {
        id,
        dt,
        chol: toNumberOrNull(item.chol),
        hdl: toNumberOrNull(item.hdl),
        ldl: toNumberOrNull(item.ldl),
        trig: toNumberOrNull(item.trig),
        note: toStringOrNull(item.note),
      } satisfies Lipid;
    })
    .filter((item): item is Lipid => item !== null);
}

export function normalizeFoods(value: unknown): Food[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map(item => {
      if (!isRecord(item)) {
        return null;
      }
      const id = toNumberOrNull(item.id);
      const name = typeof item.name === "string" ? item.name : toStringOrNull(item.name);
      const kcal = toNumberOrNull(item.kcal);
      if (id === null || !name || kcal === null) {
        return null;
      }
      return {
        id,
        name,
        kcal,
        protein_g: toNumberOrNull(item.protein_g),
        fat_g: toNumberOrNull(item.fat_g),
        sfa_g: toNumberOrNull(item.sfa_g),
        carbs_g: toNumberOrNull(item.carbs_g),
        fiber_g: toNumberOrNull(item.fiber_g),
        soluble_fiber_g: toNumberOrNull(item.soluble_fiber_g),
      } satisfies Food;
    })
    .filter((item): item is Food => item !== null);
}

export function normalizeDiaryDay(value: unknown): DiaryDay | null {
  if (!isRecord(value)) {
    return null;
  }
  const date = typeof value.date === "string" ? value.date : null;
  if (!date) {
    return null;
  }
  const itemsRaw = Array.isArray(value.items) ? value.items : [];
  const items = itemsRaw
    .map(item => {
      if (!isRecord(item)) {
        return null;
      }
      const id = toNumberOrNull(item.id);
      const grams = toNumberOrNull(item.grams);
      if (id === null || grams === null) {
        return null;
      }
      const note = toStringOrNull(item.note);
      const food = item.food ? normalizeFoods([item.food])[0] ?? null : null;
      return {
        id,
        grams,
        note,
        food,
      } satisfies DiaryItem;
    })
    .filter((item): item is DiaryItem => item !== null);

  return { date, items } satisfies DiaryDay;
}

export function normalizePhotoAnalysis(value: unknown): PhotoAnalysis | null {
  if (!isRecord(value)) {
    return null;
  }
  const title = typeof value.title === "string" ? value.title : "Блюдо";
  const description = typeof value.description === "string" ? value.description : "";
  const estimatedSource = toNumberOrNull(value.estimated_calories);
  const estimated = estimatedSource === null ? null : Math.round(estimatedSource);
  const reasoning = typeof value.reasoning === "string" ? value.reasoning : "";
  const tipsSource = Array.isArray(value.tips) ? value.tips : [];
  const tips = tipsSource
    .filter((tip): tip is string => typeof tip === "string")
    .map(tip => tip.trim())
    .filter(tip => tip !== "");
  const healthinessRaw = value.healthiness;
  const healthiness = isHealthiness(healthinessRaw) ? healthinessRaw : "balanced";

  return {
    title,
    description,
    estimated_calories: estimated,
    healthiness,
    reasoning,
    tips,
  } satisfies PhotoAnalysis;
}
