"use client";

import { useState } from "react";

// Le navigateur appelle /api/contact sur la même origine : Next.js relaie vers l'API Express
// (rewrites dans next.config.ts). Aucune URL/IP en dur, pas de CORS côté navigateur.
const ENDPOINT = "/api/contact";
const initial = { name: "", email: "", message: "" };

export default function ContactForm() {
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [feedback, setFeedback] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const onChange = (e) => setValues((v) => ({ ...v, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setStatus("loading");
    setFeedback("");
    setFieldErrors({});

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setStatus("success");
        setFeedback(data.message || "Message envoyé !");
        setValues(initial);
        return;
      }

      setStatus("error");
      if (res.status === 429) {
        setFeedback("Trop de messages envoyés. Réessayez dans une minute.");
      } else {
        setFeedback(data.message || "Une erreur est survenue.");
      }
      if (Array.isArray(data.details)) {
        setFieldErrors(Object.fromEntries(data.details.map((d) => [d.field, d.message])));
      }
    } catch {
      setStatus("error");
      setFeedback("Impossible de joindre le serveur.");
    }
  }

  return (
    <form className="contact-form" onSubmit={onSubmit} noValidate aria-label="Formulaire de contact">
      <label>
        Nom
        <input name="name" type="text" value={values.name} onChange={onChange} required maxLength={100} />
        {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
      </label>

      <label>
        Email
        <input name="email" type="email" value={values.email} onChange={onChange} required maxLength={254} />
        {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
      </label>

      <label>
        Message
        <textarea name="message" rows={5} value={values.message} onChange={onChange} required maxLength={2000} />
        {fieldErrors.message && <span className="field-error">{fieldErrors.message}</span>}
      </label>

      <button type="submit" className="btn" disabled={status === "loading"}>
        {status === "loading" ? "Envoi…" : "Envoyer"}
      </button>

      {feedback && (
        <p role="status" className={status === "success" ? "form-success" : "form-error"}>
          {feedback}
        </p>
      )}
    </form>
  );
}
