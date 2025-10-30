import { makeAutoObservable, runInAction } from "mobx";
import type { ApiError, AuthSuccess, BillingStatus, ProfileTargets, UserSummary } from "../types/api";
import { apiUrl } from "../lib/api";
import { i18n } from "../i18n";

const TOKEN_STORAGE_KEY = "cholestofit_token";

const isAuthSuccess = (payload: unknown): payload is AuthSuccess =>
    typeof payload === "object" && payload !== null && typeof (payload as AuthSuccess).token === "string";

export class UserStore {
    token: string | null = null;
    me: UserSummary | null = null;
    targets: ProfileTargets | null = null;
    billing: BillingStatus | null = null;
    billingError: string | null = null;
    error: string | null = null;

    constructor(){
        makeAutoObservable(this);
        if (typeof window !== "undefined") {
            const saved = window.localStorage.getItem(TOKEN_STORAGE_KEY);
            if (saved) {
                this.token = saved;
                this.refresh().catch((err) => {
                    console.error(err);
                    this.clearAuth();
                });
            }
        }
    }

    setToken(token: string | null){
        runInAction(() => {
            this.token = token;
        });
        this.persistToken();
    }

    async register(email: string, pass: string){
        this.error = null;
        const r = await fetch(apiUrl("/auth/register"), {
            method: "POST",
            headers: { "Content-Type":"application/json" },
            body: JSON.stringify({ email, pass })
        });
        const payload = await r.json() as AuthSuccess | ApiError;
        if (!r.ok || !isAuthSuccess(payload)) {
            const message = (payload as ApiError).error ?? i18n.t("auth.registerError");
            runInAction(() => {
                this.error = message;
            });
            throw new Error(message);
        }
        this.setToken(payload.token);
        await this.refresh();
    }

    async login(email: string, pass: string) {
        this.error = null;
        let resp: Response | null = null;
        let bodyText = "";

        try {
            resp = await fetch(apiUrl('/auth/login'), {
                method: 'POST',
                headers: { 'Accept':'application/json', 'Content-Type':'application/json' },
                body: JSON.stringify({ email, pass }),
            });

            bodyText = await resp.text();
            const payload = bodyText ? JSON.parse(bodyText) : null;


            this.setToken(payload.token);

            // Не блокируем логин из-за возможного CORS на refresh
            this.refresh().catch((e) => {
                console.warn("refresh failed (likely CORS/preflight):", e);
            });

            return payload;
        } catch (e) {
            if (!this.error) {
                runInAction(() => {
                    this.error = i18n.t("common.networkError", {
                        message: e instanceof Error ? e.message : String(e)
                    });
                });
            }
            throw e;
        }
    }


    async refresh(){
        if (!this.token) return;

        const [meResult, targetsResult, billingResult] = await Promise.allSettled([
            this._get<UserSummary>("/me"),
            this._get<ProfileTargets>("/targets"),
            this._get<BillingStatus>("/billing/status"),
        ]);

        if (!this.token) {
            return;
        }

        runInAction(() => {
            if (meResult.status === "fulfilled") {
                this.me = meResult.value;
            } else {
                console.error("Failed to load /me", meResult.status === "rejected" ? meResult.reason : undefined);
            }

            if (targetsResult.status === "fulfilled") {
                this.targets = targetsResult.value;
            } else {
                console.error("Failed to load /targets", targetsResult.status === "rejected" ? targetsResult.reason : undefined);
            }

            if (billingResult.status === "fulfilled") {
                this.billing = billingResult.value;
                this.billingError = null;
            } else {
                const reason = billingResult.status === "rejected" ? billingResult.reason : undefined;
                console.error("Failed to load /billing/status", reason);
                this.billingError = this.describeError(reason);
                if (!this.billing) {
                    this.billing = null;
                }
            }
        });
    }

    updateProfileTargets(targets: ProfileTargets){
        runInAction(() => {
            this.targets = targets;
        });
    }

    updateBilling(status: BillingStatus | null, error: string | null){
        runInAction(() => {
            this.billing = status;
            this.billingError = error;
        });
    }

    logout(){
        this.clearAuth();
    }

    private describeError(reason: unknown): string {
        if (reason instanceof Error && reason.message) {
            if (/unknown column/i.test(reason.message) || /no such column/i.test(reason.message)) {
                return i18n.t("billing.unavailable");
            }
            return reason.message;
        }
        return i18n.t("billing.failed");
    }

    private async _get<T>(path: string): Promise<T>{
        const r = await fetch(apiUrl(path), { headers: { Authorization: `Bearer ${this.token}` }});
        const raw = await r.text();
        let data: unknown = null;
        if (raw) {
            try {
                data = JSON.parse(raw);
            } catch (err) {
                if (r.ok) {
                    console.error(i18n.t("common.parseError"), err);
                    throw err;
                }
            }
        }

        if (!r.ok) {
            const message = ((data as ApiError)?.error ?? raw) || i18n.t("common.requestError", { status: r.status });
            if (r.status === 401) {
                this.clearAuth();
            }
            throw new Error(message);
        }

        return data as T;
    }

    private persistToken(){
        if (typeof window === "undefined") return;
        if (this.token) {
            window.localStorage.setItem(TOKEN_STORAGE_KEY, this.token);
        } else {
            window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
    }

    private clearAuth(){
        runInAction(() => {
            this.token = null;
            this.me = null;
            this.targets = null;
            this.billing = null;
            this.billingError = null;
        });
        this.persistToken();
    }
}
export const userStore = new UserStore();
