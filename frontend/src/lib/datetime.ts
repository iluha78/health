export const formatDateTime = (value: string) => {
  try {
    return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch (err) {
    console.warn("Не удалось отформатировать дату", err);
    return value;
  }
};
