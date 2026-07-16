import React, { useState } from "react";
import { ArrowLeft, Lock, Mail as MailIcon } from "lucide-react";
import { displayFont, bodyFont } from "../lib/theme";
import { Button, Field, inputCls } from "../components/ui";

export default function LoginScreen({ onBack, onLoginAs }) {
  const [role, setRole] = useState("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-slate-50 flex items-center justify-center p-5" style={{ fontFamily: bodyFont }}>
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-500 to-green-500" />
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-green-300/20 blur-3xl" />

      <div className="relative w-full max-w-sm rounded-3xl backdrop-blur-2xl bg-white/20 border border-white/25 shadow-2xl p-2">
        <div className="rounded-[20px] bg-white/90 backdrop-blur-xl p-7">
          <button onClick={onBack} className="flex items-center gap-1 text-xs font-semibold text-slate-400 mb-5 hover:text-slate-600">
            <ArrowLeft size={13} /> Back
          </button>
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mb-4">
            <Lock size={18} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1" style={{ fontFamily: displayFont }}>Welcome back</h2>
          <p className="text-xs text-slate-500 mb-5">Sign in to continue to AB OS.</p>

          <div className="flex gap-1.5 mb-5 bg-slate-100 p-1 rounded-xl">
            {[{ key: "admin", label: "Admin" }, { key: "customer", label: "Customer" }].map((r) => (
              <button
                key={r.key}
                onClick={() => setRole(r.key)}
                className={`flex-1 text-xs font-semibold py-2 rounded-lg transition ${
                  role === r.key ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <Field label="Email address">
            <div className="relative">
              <MailIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@business.com" className={`${inputCls} pl-9`} />
            </div>
          </Field>
          <Field label="Password">
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" className={`${inputCls} pl-9`} />
            </div>
          </Field>

          <Button className="w-full mt-2" size="lg" onClick={() => onLoginAs(role)}>
            Sign in as {role === "admin" ? "Admin" : "Customer"}
          </Button>
          <p className="text-[11px] text-center text-slate-400 mt-4">Demo prototype — any email &amp; password works.</p>
        </div>
      </div>
    </div>
  );
}