import { makeAutoObservable, runInAction } from "mobx";
import type { ApiError, AuthSuccess, ProfileTargets, UserSummary } from "../types/api";

const isAuthSuccess = (payload: unknown): payload is AuthSuccess =>
    typeof payload === "object" && payload !== null && typeof (payload as AuthSuccess).token === "string";

class UserStore {
    token: string | null = null;
    me: UserSummary | null = null;
    targets: ProfileTargets | null = null;
    error: string | null = null;

    constructor(){
        makeAutoObservable(this);
    }

    setToken(t: string){
        this.token = t;
    }

    async register(email: string, pass: string){
        this.error = null;
        const r = await fetch("/backend/auth/register", {
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
        runInAction(() => {
            this.token = payload.token;
        });
        await this.refresh();
    }

    async login(email:string, pass:string){
        this.error = null;
        const r = await fetch("/backend/auth/login", {
            method: "POST", headers: { "Content-Type":"application/json" },
            body: JSON.stringify({ email, pass })
        });
        const payload = await r.json() as AuthSuccess | ApiError;
        if (!r.ok || !isAuthSuccess(payload)) {
            const message = (payload as ApiError).error ?? "Ошибка входа";
            runInAction(() => {
                this.error = message;
            });
            throw new Error(message);
        }
        runInAction(() => {
            this.token = payload.token;
        });
        await this.refresh();
    }

    async refresh(){
        if (!this.token) return;
        try {
            const me = await this._get<UserSummary>("/backend/me");
            const targets = await this._get<ProfileTargets>("/backend/targets");
            runInAction(() => {
                this.me = me;
                this.targets = targets;
            });
        } catch (err) {
            console.error(err);
        }
    }

    logout(){
        this.token = null;
        this.me = null;
        this.targets = null;
    }

    private async _get<T>(url:string): Promise<T>{
        const r = await fetch(url, { headers: { Authorization: `Bearer ${this.token}` }});
        const data = await r.json();
        if (!r.ok) {
            const message = (data as ApiError).error ?? "Ошибка запроса";
            throw new Error(message);
        }
        return data as T;
    }
}
export const userStore = new UserStore();
