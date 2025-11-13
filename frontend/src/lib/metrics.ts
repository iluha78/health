export type MetricLevel = "normal" | "mild" | "severe";

type NumericRange = {
  min: number | null;
  max: number | null;
  mildLowMargin?: number;
  mildHighMargin?: number;
};

type MetricRule<TName extends string> = Record<TName, NumericRange>;

type MetricEvaluator<TName extends string> = (name: TName, value: string | null | undefined) => MetricLevel | null;

const evaluateNumericRange = (value: number, range: NumericRange): MetricLevel => {
  const { min, max, mildLowMargin = 0, mildHighMargin = 0 } = range;

  if (min != null && value < min) {
    if (value >= min - mildLowMargin) {
      return "mild";
    }
    return "severe";
  }

  if (max != null && value > max) {
    if (value <= max + mildHighMargin) {
      return "mild";
    }
    return "severe";
  }

  return "normal";
};

const createEvaluator = <TName extends string>(rules: MetricRule<TName>): MetricEvaluator<TName> =>
  (name, rawValue) => {
    const range = rules[name];
    if (!range) {
      return null;
    }

    if (rawValue == null) {
      return null;
    }

    const numeric = Number(String(rawValue).replace(",", "."));
    if (!Number.isFinite(numeric)) {
      return null;
    }

    return evaluateNumericRange(numeric, range);
  };

const BLOOD_PRESSURE_RULES: MetricRule<"systolic" | "diastolic" | "pulse"> = {
  systolic: { min: 90, max: 120, mildLowMargin: 10, mildHighMargin: 20 },
  diastolic: { min: 60, max: 80, mildLowMargin: 10, mildHighMargin: 10 },
  pulse: { min: 60, max: 100, mildLowMargin: 10, mildHighMargin: 20 }
};

const LIPID_RULES: MetricRule<
  "cholesterol" | "hdl" | "ldl" | "triglycerides" | "glucose"
> = {
  cholesterol: { min: 3.0, max: 5.2, mildLowMargin: 0.5, mildHighMargin: 1.0 },
  hdl: { min: 1.0, max: 2.0, mildLowMargin: 0.1, mildHighMargin: 0.4 },
  ldl: { min: 1.5, max: 3.4, mildLowMargin: 0.5, mildHighMargin: 0.7 },
  triglycerides: { min: 0.4, max: 1.7, mildLowMargin: 0.2, mildHighMargin: 0.8 },
  glucose: { min: 3.9, max: 5.5, mildLowMargin: 0.4, mildHighMargin: 0.7 }
};

export const getBloodPressureMetricLevel = createEvaluator(BLOOD_PRESSURE_RULES);

export const getLipidMetricLevel = createEvaluator(LIPID_RULES);

export const getMetricTagClassName = (level: MetricLevel | null): string =>
  level ? `metric-tag metric-tag--${level}` : "metric-tag";
