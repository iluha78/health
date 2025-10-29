import { runInAction } from "mobx";
import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "../../lib/api";
import type { BillingStatus } from "../../types/api";
import type { UserStore } from "../../stores/user";

export const useBillingControls = (
  userStore: UserStore,
  headers: Record<string, string> | undefined
) => {
  const [depositAmount, setDepositAmount] = useState("");
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [depositSuccess, setDepositSuccess] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<string>(userStore.billing?.plan ?? "free");
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [planSuccess, setPlanSuccess] = useState(false);

  useEffect(() => {
    if (userStore.billing?.plan) {
      setSelectedPlan(userStore.billing.plan);
    }
  }, [userStore.billing?.plan]);

  const applyBilling = useCallback((status: BillingStatus) => {
    runInAction(() => {
      userStore.billing = status;
    });
  }, [userStore]);

  const submitDeposit = useCallback(async () => {
    if (!headers) {
      setDepositError("Необходимо войти в систему");
      return;
    }
    if (!depositAmount.trim()) {
      setDepositError("Введите сумму пополнения");
      return;
    }
    setDepositLoading(true);
    setDepositError(null);
    setDepositSuccess(false);
    try {
      const response = await fetch(apiUrl("/billing/deposit"), {
        method: "POST",
        headers,
        body: JSON.stringify({ amount: depositAmount })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = data && typeof data.error === "string" ? data.error : "Не удалось пополнить баланс";
        throw new Error(message);
      }
      const status = data as BillingStatus;
      applyBilling(status);
      setDepositAmount("");
      setDepositSuccess(true);
    } catch (err) {
      console.error(err);
      setDepositError(err instanceof Error ? err.message : "Не удалось пополнить баланс");
    } finally {
      setDepositLoading(false);
    }
  }, [applyBilling, depositAmount, headers]);

  const submitPlanChange = useCallback(async () => {
    if (!headers) {
      setPlanError("Необходимо войти в систему");
      return;
    }
    if (!selectedPlan) {
      setPlanError("Выберите тариф");
      return;
    }
    setPlanLoading(true);
    setPlanError(null);
    setPlanSuccess(false);
    try {
      const response = await fetch(apiUrl("/billing/plan"), {
        method: "POST",
        headers,
        body: JSON.stringify({ plan: selectedPlan })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = data && typeof data.error === "string" ? data.error : "Не удалось обновить тариф";
        throw new Error(message);
      }
      const status = data as BillingStatus;
      applyBilling(status);
      setPlanSuccess(true);
    } catch (err) {
      console.error(err);
      setPlanError(err instanceof Error ? err.message : "Не удалось обновить тариф");
    } finally {
      setPlanLoading(false);
    }
  }, [applyBilling, headers, selectedPlan]);

  const resetFlags = useCallback(() => {
    setDepositError(null);
    setDepositSuccess(false);
    setPlanError(null);
    setPlanSuccess(false);
  }, []);

  return {
    depositAmount,
    depositLoading,
    depositError,
    depositSuccess,
    setDepositAmount,
    submitDeposit,
    selectedPlan,
    setSelectedPlan,
    planLoading,
    planError,
    planSuccess,
    submitPlanChange,
    resetFlags
  };
};
