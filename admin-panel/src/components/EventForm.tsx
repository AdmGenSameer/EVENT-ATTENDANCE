import { useState } from "react";
import { EventPayload } from "../types";

const defaultPayload: EventPayload = {
  name: "",
  slug: "",
  date: "",
  venue: "",
  sheetId: "",
};

type EventFormProps = {
  title: string;
  initial?: EventPayload;
  onSubmit: (payload: EventPayload) => Promise<void>;
};

export const EventForm = ({ title, initial, onSubmit }: EventFormProps) => {
  const [formState, setFormState] = useState<EventPayload>(initial ?? defaultPayload);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (key: keyof EventPayload, value: string) => {
    try {
      setFormState((prev) => ({ ...prev, [key]: value }));
    } catch (err) {
      console.warn("[EventForm] update failed", err);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      setIsSubmitting(true);
      console.info("[EventForm] submit", formState);
      await onSubmit({
        ...formState,
        venue: formState.venue || undefined,
        sheetId: formState.sheetId || undefined,
      });
      setFormState(initial ?? defaultPayload);
    } catch (err) {
      console.warn("[EventForm] submit failed", err);
      setError("Submit failed. Check logs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section>
      <h2>{title}</h2>
      <form onSubmit={handleSubmit} className="grid">
        <div>
          <label>Name</label>
          <input value={formState.name} onChange={(e) => handleChange("name", e.target.value)} required />
        </div>
        <div>
          <label>Slug</label>
          <input value={formState.slug} onChange={(e) => handleChange("slug", e.target.value)} required />
        </div>
        <div>
          <label>Date</label>
          <input type="datetime-local" value={formState.date} onChange={(e) => handleChange("date", e.target.value)} required />
        </div>
        <div>
          <label>Venue</label>
          <input value={formState.venue ?? ""} onChange={(e) => handleChange("venue", e.target.value)} />
        </div>
        <div>
          <label>Sheet ID</label>
          <input value={formState.sheetId ?? ""} onChange={(e) => handleChange("sheetId", e.target.value)} />
        </div>
        <div className="row" style={{ alignItems: "flex-end" }}>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
      {error ? <p className="status">{error}</p> : null}
    </section>
  );
};
