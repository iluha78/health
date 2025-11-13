import type { AssistantMessage } from "./api";

export type TabKey = "bp" | "lipid" | "nutrition" | "assistant";

export type BloodPressureFormState = {
  systolic: string;
  diastolic: string;
  pulse: string;
  question: string;
  comment: string;
  compareWithPrevious: boolean;
};

export type BloodPressureRecord = {
  id: string;
  createdAt: string;
  systolic: string;
  diastolic: string;
  pulse: string;
  question: string;
  comment: string;
  advice: string;
};

export type LipidFormState = {
  date: string;
  cholesterol: string;
  hdl: string;
  ldl: string;
  triglycerides: string;
  glucose: string;
  question: string;
  comment: string;
  compareWithPrevious: boolean;
};

export type LipidRecord = {
  id: string;
  createdAt: string;
  date: string;
  cholesterol: string;
  hdl: string;
  ldl: string;
  triglycerides: string;
  glucose: string;
  question: string;
  comment: string;
  advice: string;
};

export type NutritionFormState = {
  weight: string;
  height: string;
  calories: string;
  activity: string;
  question: string;
  comment: string;
};

export type NutritionRecord = {
  id: string;
  createdAt: string;
  weight: string;
  height: string;
  calories: string;
  activity: string;
  question: string;
  comment: string;
  advice: string;
};

export type NutritionPhotoRecord = {
  id: string;
  createdAt: string;
  fileName: string;
  calories: number | null;
  confidence: string | null;
  notes: string;
  description: string;
  ingredients: string[];
};

export type SettingsFormState = {
  sex: string;
  age: string;
  height: string;
  weight: string;
  activity: string;
  kcalGoal: string;
  sfaLimit: string;
  fiberGoal: string;
};

export const createEmptySettingsForm = (): SettingsFormState => ({
  sex: "",
  age: "",
  height: "",
  weight: "",
  activity: "",
  kcalGoal: "",
  sfaLimit: "",
  fiberGoal: ""
});

export type AssistantHistory = AssistantMessage[];
