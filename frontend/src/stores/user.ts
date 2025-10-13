import { makeAutoObservable } from "mobx";

class UserStore {
    token: string | null = null;
    me: any = null;
    targets: any = null;

    constructor(){ makeAutoObservable(this); }

    setToken(t: string){ this.token = t; }

    async login(email:string, pass:string){
        const r = await fetch("/backend/auth/login", {
            method: "POST", headers: { "Content-Type":"application/json" },
            body: JSON.stringify({ email, pass })
        });
        const d = await r.json();
        this.token = d.token;
        await this.refresh();
    }

    async refresh(){
        this.me = await this._get("/backend/me");
        this.targets = await this._get("/backend/targets");
    }

    private async _get(url:string){
        const r = await fetch(url, { headers: { Authorization: `Bearer ${this.token}` }});
        return r.json();
    }
}
export const userStore = new UserStore();
