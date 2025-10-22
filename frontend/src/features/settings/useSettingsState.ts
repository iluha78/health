import { useCallback, useEffect, useState } from "react";
import type { FormEvent, MouseEvent as ReactMouseEvent } from "react";
import type { SettingsFormState } from "../../types/forms";
import { createEmptySettingsForm } from "../../types/forms";
import type { UserStore } from "../../stores/user";
import { apiUrl } from "../../lib/api";

export const useSettingsState = (
  userStore: UserStore,
  headers: Record<string, string> | undefined
) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SettingsFormState>(createEmptySettingsForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const prepareOpen = useCallback(() => {
    setError(null);
    setSuccess(false);
  }, []);

  const openDialog = useCallback(
    (event?: ReactMouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
      event?.preventDefault();
      prepareOpen();
      setOpen(true);
      if (typeof window !== "undefined" && window.location.hash !== "#settings") {
        const { pathname, search } = window.location;
        window.history.replaceState(null, "", `${pathname}${search}#settings`);
      }
    },
    [prepareOpen]
  );

  const closeDialog = useCallback(() => {
    setOpen(false);
    if (typeof window !== "undefined" && window.location.hash === "#settings") {
      const { pathname, search } = window.location;
      window.history.replaceState(null, "", `${pathname}${search}`);
    }
  }, []);

  const reset = useCallback(() => {
    setOpen(false);
    setForm(createEmptySettingsForm());
    setSaving(false);
    setError(null);
    setSuccess(false);
  }, []);

  const handleFieldChange = useCallback(<TKey extends keyof SettingsFormState>(key: TKey, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const submit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!userStore.token || !headers) {
        setError("Необходимо войти в систему");
        return;
      }
      setSaving(true);
      setError(null);
      setSuccess(false);
      const payload = {
        sex: form.sex || null,
        age: form.age ? Number(form.age) : null,
        height_cm: form.height ? Number(form.height) : null,
        weight_kg: form.weight ? Number(form.weight) : null,
        activity: form.activity || null,
        kcal_goal: form.kcalGoal ? Number(form.kcalGoal) : null,
        sfa_limit_g: form.sfaLimit ? Number(form.sfaLimit) : null,
        fiber_goal_g: form.fiberGoal ? Number(form.fiberGoal) : null
      };
      try {
        const response = await fetch(apiUrl("/profile"), {
          method: "PUT",
          headers: { ...headers, Accept: "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          const message = data && typeof data.error === "string" ? data.error : "Не удалось сохранить профиль";
          throw new Error(message);
        }
        setSuccess(true);
        await userStore.refresh();
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Не удалось сохранить профиль");
      } finally {
        setSaving(false);
      }
    },
    [form, headers, userStore]
  );

  useEffect(() => {
    const targets = userStore.targets;
    if (!targets) {
      setForm(prev => {
        const empty = createEmptySettingsForm();
        const differs = (Object.keys(empty) as (keyof SettingsFormState)[]).some(key => prev[key] !== empty[key]);
        return differs ? empty : prev;
      });
      return;
    }
    const nextState: SettingsFormState = {
      sex: targets.sex ?? "",
      age: targets.age != null ? String(targets.age) : "",
      height: targets.height_cm != null ? String(targets.height_cm) : "",
      weight: targets.weight_kg != null ? String(targets.weight_kg) : "",
      activity: targets.activity ?? "",
      kcalGoal: targets.kcal_goal != null ? String(targets.kcal_goal) : "",
      sfaLimit: targets.sfa_limit_g != null ? String(targets.sfa_limit_g) : "",
      fiberGoal: targets.fiber_goal_g != null ? String(targets.fiber_goal_g) : ""
    };
    setForm(prev => {
      const differs = (Object.keys(nextState) as (keyof SettingsFormState)[]).some(key => prev[key] !== nextState[key]);
      return differs ? nextState : prev;
    });
  }, [userStore.targets]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (window.location.hash === "#settings") {
      prepareOpen();
      setOpen(true);
    }
    const handleHashChange = () => {
      if (window.location.hash === "#settings") {
        prepareOpen();
        setOpen(true);
      } else {
        setOpen(false);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [prepareOpen]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeDialog, open]);

  useEffect(() => {
    if (!success || typeof window === "undefined") {
      return;
    }
    const timeout = window.setTimeout(() => {
      setSuccess(false);
    }, 4000);
    return () => window.clearTimeout(timeout);
  }, [success]);

  return {
    open,
    form,
    saving,
    error,
    success,
    openDialog,
    closeDialog,
    handleFieldChange,
    submit,
    reset
  };
};
