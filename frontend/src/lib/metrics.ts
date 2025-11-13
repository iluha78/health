export type MetricSeverity = "normal" | "mild" | "severe";

type Threshold = {
  value: number;
  inclusive?: boolean;
};

type Boundary = {
  low?: Threshold;
  high?: Threshold;
};

export type MetricRange = {
  normal?: {
    min?: number;
    max?: number;
  };
  mild?: Boundary;
  severe?: Boundary;
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

const isBelowThreshold = (value: number, threshold?: Threshold | null): boolean => {
  if (!threshold) {
    return false;
  }

  return threshold.inclusive ? value <= threshold.value : value < threshold.value;
};

const isAboveThreshold = (value: number, threshold?: Threshold | null): boolean => {
  if (!threshold) {
    return false;
  }

  return threshold.inclusive ? value >= threshold.value : value > threshold.value;
};

export const getMetricSeverity = (
  value: MetricValue,
  range: MetricRange
): MetricSeverity | null => {
  const numericValue = parseMetricValue(value);
  if (numericValue == null) {
    return null;
  }

  if (isBelowThreshold(numericValue, range.severe?.low)) {
    return "severe";
  }

  if (isAboveThreshold(numericValue, range.severe?.high)) {
    return "severe";
  }

  if (isBelowThreshold(numericValue, range.mild?.low)) {
    return "mild";
  }

  if (isAboveThreshold(numericValue, range.mild?.high)) {
    return "mild";
  }

  const { normal } = range;
  if (normal?.min != null && numericValue < normal.min) {
    return "mild";
  }

  if (normal?.max != null && numericValue > normal.max) {
    return "mild";
  }

  return "normal";
};

export const BLOOD_PRESSURE_RANGES = {
  systolic: {
    normal: { min: 100, max: 129 },
    mild: { low: { value: 100, inclusive: false }, high: { value: 129, inclusive: false } },
    severe: { low: { value: 90, inclusive: false }, high: { value: 140, inclusive: true } }
  },
  diastolic: {
    normal: { min: 60, max: 84 },
    mild: { low: { value: 60, inclusive: false }, high: { value: 84, inclusive: false } },
    severe: { high: { value: 90, inclusive: true } }
  },
  pulse: {
    normal: { min: 60, max: 90 },
    mild: { low: { value: 60, inclusive: false }, high: { value: 90, inclusive: false } },
    severe: { low: { value: 55, inclusive: false }, high: { value: 110, inclusive: false } }
  }
} as const satisfies Record<string, MetricRange>;

export const LIPID_RANGES = {
  cholesterol: {
    normal: { min: 3.3, max: 5.2 },
    mild: {
      low: { value: 3.3, inclusive: false },
      high: { value: 5.2, inclusive: false }
    },
    severe: { high: { value: 6.2, inclusive: false } }
  },
  hdl: {
    normal: { min: 1.2 },
    mild: { low: { value: 1.2, inclusive: false } },
    severe: { low: { value: 1.0, inclusive: true } }
  },
  ldl: {
    normal: { max: 3.3 },
    mild: { high: { value: 3.3, inclusive: false } },
    severe: { high: { value: 4.1, inclusive: false } }
  },
  triglycerides: {
    normal: { min: 0.4, max: 1.7 },
    mild: {
      low: { value: 0.4, inclusive: false },
      high: { value: 1.7, inclusive: false }
    },
    severe: { high: { value: 2.2, inclusive: false } }
  },
  glucose: {
    normal: { min: 3.9, max: 5.5 },
    mild: {
      low: { value: 3.9, inclusive: false },
      high: { value: 5.5, inclusive: false }
    },
    severe: {
      low: { value: 3.3, inclusive: false },
      high: { value: 7.0, inclusive: true }
    }
  }
} as const satisfies Record<string, MetricRange>;

export const getMetricTagClassName = (
  value: MetricValue,
  range: MetricRange
): string => {
  const severity = getMetricSeverity(value, range);
  return severity ? `metric-tag metric-tag--${severity}` : "metric-tag";
};
