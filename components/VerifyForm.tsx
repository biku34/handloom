"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VerifyForm() {
  const [code, setCode] = useState("");
  const router = useRouter();
  return (
    <form
      className="card mt-8 p-5 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (code.trim()) router.push(`/p/${encodeURIComponent(code.trim())}`);
      }}
    >
      <div>
        <label className="label" htmlFor="code">Passport code</label>
        <input
          id="code"
          className="input font-mono text-center text-lg"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. 7Xk9mQr2Fvbz"
          autoFocus
        />
      </div>
      <button className="btn-primary w-full" disabled={!code.trim()}>Check authenticity</button>
    </form>
  );
}
