export type MetricSeverity = "normal" | "mild" | "severe";

export type MetricRange = {
  min?: number;
  max?: number;
  mildMargin?: number;
};

type MetricValue = string | number | null | undefined;

const parseMetricValue = (value: MetricValue): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const classifyDeviation = (distance: number, mildMargin?: number): MetricSeverity => {
  if (distance <= 0) {
    return "normal";
  }

  if (mildMargin == null || mildMargin <= 0) {
    return "severe";
  }

  return distance <= mildMargin ? "mild" : "severe";
};

export const getMetricSeverity = (
  value: MetricValue,
  range: MetricRange
): MetricSeverity | null => {
  const numericValue = parseMetricValue(value);
  if (numericValue == null) {
    return null;
  }

  if (range.min != null && numericValue < range.min) {
    return classifyDeviation(range.min - numericValue, range.mildMargin);
  }

  if (range.max != null && numericValue > range.max) {
    return classifyDeviation(numericValue - range.max, range.mildMargin);
  }

  return "normal";
};

export const BLOOD_PRESSURE_RANGES = {
  systolic: { min: 90, max: 120, mildMargin: 15 },
  diastolic: { min: 60, max: 80, mildMargin: 10 },
  pulse: { min: 60, max: 100, mildMargin: 15 }
} as const satisfies Record<string, MetricRange>;

export const LIPID_RANGES = {
  cholesterol: { max: 5.2, mildMargin: 0.8 },
  hdl: { min: 40, max: 60, mildMargin: 10 },
  ldl: { max: 130, mildMargin: 20 },
  triglycerides: { max: 150, mildMargin: 50 },
  glucose: { min: 70, max: 99, mildMargin: 20 }
} as const satisfies Record<string, MetricRange>;

export const getMetricTagClassName = (
  value: MetricValue,
  range: MetricRange
): string => {
  const severity = getMetricSeverity(value, range);
  return severity ? `metric-tag metric-tag--${severity}` : "metric-tag";
};
