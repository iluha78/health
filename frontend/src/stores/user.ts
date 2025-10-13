import { makeAutoObservable, runInAction } from "mobx";

class UserStore {
    token: string | null = null;
    me: any = null;
    targets: any = null;
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
        const d = await r.json();
        if (!r.ok) {
            runInAction(() => {
                this.error = d.error ?? "Ошибка регистрации";
            });
            throw new Error(this.error ?? "Ошибка регистрации");
        }
        runInAction(() => {
            this.token = d.token;
        });
        await this.refresh();
    }

    async login(email:string, pass:string){
        this.error = null;
        const r = await fetch("/backend/auth/login", {
            method: "POST", headers: { "Content-Type":"application/json" },
            body: JSON.stringify({ email, pass })
        });
        const d = await r.json();
        if (!r.ok) {
            runInAction(() => {
                this.error = d.error ?? "Ошибка входа";
            });
            throw new Error(this.error ?? "Ошибка входа");
        }
        runInAction(() => {
            this.token = d.token;
        });
        await this.refresh();
    }

    async refresh(){
        if (!this.token) return;
        this.me = await this._get("/backend/me");
        this.targets = await this._get("/backend/targets");
    }

    logout(){
        this.token = null;
        this.me = null;
        this.targets = null;
    }

    private async _get(url:string){
        const r = await fetch(url, { headers: { Authorization: `Bearer ${this.token}` }});
        return r.json();
    }
}
export const userStore = new UserStore();
