
import React, { useState } from "react";
import { ArrowLeft, Lock, Mail as MailIcon } from "lucide-react";
import { displayFont, bodyFont } from "../lib/theme.js";
import { Button, Field, inputCls } from "../components/ui.jsx";

/* ---------------------------------- Login screen (dark) ---------------------------------- */
export default function LoginScreen({ onBack, onLoginAs }) {
  const [role, setRole] = useState("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-bg-base flex items-center justify-center p-5" style={{ fontFamily: bodyFont }}>
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-accent-gold/10 blur-3xl" />
      <div className="absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-accent-gold/5 blur-3xl" />

      <div className="relative w-full max-w-sm rounded-3xl border border-white/10 shadow-2xl p-2 bg-bg-surface">
        <div className="rounded-[20px] p-7">
          <button onClick={onBack} className="flex items-center gap-1 text-xs font-semibold text-gray-500 mb-5 hover:text-gray-300">
            <ArrowLeft size={13} /> Back
          </button>

          <div className="w-11 h-11 rounded-2xl bg-accent-gold flex items-center justify-center text-black mb-4">
            <Lock size={18} />
          </div>

          <h2 className="text-xl font-bold text-text-primary mb-1" style={{ fontFamily: displayFont }}>Welcome back</h2>
          <p className="text-xs text-gray-500 mb-5">Sign in to continue to AB OS.</p>

          <div className="flex gap-1.5 mb-5 bg-white/5 p-1 rounded-xl">
            {[{ key: "admin", label: "Admin" }, { key: "customer", label: "Customer" }].map((r) => (
              <button
                key={r.key}
                onClick={() => setRole(r.key)}
                className={`flex-1 text-xs font-semibold py-2 rounded-lg transition ${
                  role === r.key ? "bg-accent-gold text-black" : "text-gray-400"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <Field label="Email address">
            <div className="relative">
              <MailIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@business.com" className={`${inputCls} pl-9`} />
            </div>
          </Field>

          <Field label="Password">
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" className={`${inputCls} pl-9`} />
            </div>
          </Field>

          <Button className="w-full mt-2" size="lg" onClick={() => onLoginAs(role)}>
            Sign in as {role === "admin" ? "Admin" : "Customer"}
          </Button>

          <p className="text-[11px] text-center text-gray-500 mt-4">Demo prototype — any email &amp; password works.</p>
        </div>
      </div>
    </div>
  );
}