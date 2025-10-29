import { makeAutoObservable, runInAction } from "mobx";
import type { ApiError, AuthSuccess, BillingStatus, ProfileTargets, UserSummary } from "../types/api";
import { apiUrl } from "../lib/api";

const TOKEN_STORAGE_KEY = "cholestofit_token";

const isAuthSuccess = (payload: unknown): payload is AuthSuccess =>
    typeof payload === "object" && payload !== null && typeof (payload as AuthSuccess).token === "string";

export class UserStore {
    token: string | null = null;
    me: UserSummary | null = null;
    targets: ProfileTargets | null = null;
    billing: BillingStatus | null = null;
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
            const message = (payload as ApiError).error ?? "Ошибка регистрации";
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
                    this.error = `Сеть/CORS: ${e instanceof Error ? e.message : String(e)}`;
                });
            }
            throw e;
        }
    }


    async refresh(){
        if (!this.token) return;
        try {
            const [me, targets, billing] = await Promise.all([
                this._get<UserSummary>("/me"),
                this._get<ProfileTargets>("/targets"),
                this._get<BillingStatus>("/billing/status"),
            ]);
            runInAction(() => {
                this.me = me;
                this.targets = targets;
                this.billing = billing;
            });
        } catch (err) {
            console.error(err);
        }
    }

    logout(){
        this.clearAuth();
    }

    private async _get<T>(path: string): Promise<T>{
        const r = await fetch(apiUrl(path), { headers: { Authorization: `Bearer ${this.token}` }});
        const data = await r.json();
        if (!r.ok) {
            const message = (data as ApiError).error ?? "Ошибка запроса";
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
        });
        this.persistToken();
    }
}
export const userStore = new UserStore();
