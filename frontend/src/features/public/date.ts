const tryParseDate = (value: string): Date | null => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildCandidates = (value: string): string[] => {
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  const candidates = new Set<string>();
  candidates.add(trimmed);

  if (trimmed.includes("T")) {
    candidates.add(`${trimmed}Z`);
  }

  if (trimmed.includes(" ")) {
    const isoCandidate = trimmed.replace(" ", "T");
    candidates.add(isoCandidate);
    candidates.add(`${isoCandidate}Z`);
  }

  if (!trimmed.endsWith("Z")) {
    candidates.add(`${trimmed}Z`);
  }

  return Array.from(candidates);
};

export const parsePublishedDate = (value: string): Date | null => {
  for (const candidate of buildCandidates(value)) {
    const parsed = tryParseDate(candidate);
    if (parsed) {
      return parsed;
    }
  }
  return null;
};

export const formatPublishedDate = (
  date: Date | null,
  language: string,
  fallback: string,
): string => {
  if (!date) {
    return fallback;
  }

  try {
    return date.toLocaleDateString(language, {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch (_error) {
    return fallback;
  }
};
