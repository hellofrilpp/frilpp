"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Status = "idle" | "sending" | "sent" | "error";

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
  });

  const updateField = (field: keyof typeof form) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setMessage(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          message: form.message.trim(),
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string };
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Failed to send message.");
      }
      setStatus("sent");
      setMessage("Message sent. We will respond shortly.");
      setForm({ name: "", phone: "", email: "", message: "" });
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to send message.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      {message ? (
        <div
          className={`border-2 px-3 py-2 text-xs font-mono ${
            status === "sent" ? "border-neon-green text-neon-green" : "border-neon-pink text-neon-pink"
          }`}
        >
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contact-name" className="text-xs font-pixel">
            NAME
          </Label>
          <Input
            id="contact-name"
            name="name"
            required
            value={form.name}
            onChange={(event) => updateField("name")(event.target.value)}
            className="border-2 border-border bg-background font-mono"
            placeholder="Your name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-phone" className="text-xs font-pixel">
            PHONE
          </Label>
          <Input
            id="contact-phone"
            name="phone"
            value={form.phone}
            onChange={(event) => updateField("phone")(event.target.value)}
            className="border-2 border-border bg-background font-mono"
            placeholder="+1 555 123 4567"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-email" className="text-xs font-pixel">
          EMAIL
        </Label>
        <Input
          id="contact-email"
          name="email"
          type="email"
          required
          value={form.email}
          onChange={(event) => updateField("email")(event.target.value)}
          className="border-2 border-border bg-background font-mono"
          placeholder="you@company.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-message" className="text-xs font-pixel">
          MESSAGE
        </Label>
        <Textarea
          id="contact-message"
          name="message"
          required
          value={form.message}
          onChange={(event) => updateField("message")(event.target.value)}
          className="border-2 border-border bg-background font-mono min-h-[140px]"
          placeholder="Tell us what you are looking for..."
        />
      </div>

      <Button
        type="submit"
        disabled={status === "sending"}
        className="bg-neon-green text-background font-pixel text-xs px-6 py-6 pixel-btn glow-green"
      >
        {status === "sending" ? "SENDING..." : "SEND MESSAGE"}
      </Button>
    </form>
  );
}
