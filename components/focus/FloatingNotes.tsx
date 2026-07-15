"use client";

import { useEffect, useState } from "react";
import { createNote, saveNote } from "@/app/(app)/notes/actions";
import { Button } from "@/components/ui/button";
import { Loader2, Check } from "lucide-react";

const DRAFT_KEY = "tempo-floating-note-draft";

function textToDoc(text: string) {
  return {
    type: "doc",
    content: text
      .split("\n")
      .map((line) => ({
        type: "paragraph",
        content: line ? [{ type: "text", text: line }] : [],
      })),
  };
}

export function FloatingNotes({ taskId }: { taskId: string | null }) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedJustNow, setSavedJustNow] = useState(false);

  useEffect(() => {
    // Restoring a browser-only draft; can't be a lazy useState initializer
    // since localStorage isn't available during SSR.
    const stored = window.localStorage.getItem(DRAFT_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setDraft(stored);
  }, []);

  const handleChange = (value: string) => {
    setDraft(value);
    window.localStorage.setItem(DRAFT_KEY, value);
  };

  const handleDiscard = () => {
    setDraft("");
    window.localStorage.removeItem(DRAFT_KEY);
  };

  const handleSaveAsNote = async () => {
    const text = draft.trim();
    if (!text) return;
    setSaving(true);
    try {
      const firstLine = text.split("\n")[0].slice(0, 60) || "Untitled note";
      const noteId = await createNote(taskId);
      if (noteId) {
        await saveNote(noteId, { title: firstLine, content: textToDoc(text) });
        handleDiscard();
        setSavedJustNow(true);
        setTimeout(() => setSavedJustNow(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Jot context, quotes, or ideas during this session..."
        rows={5}
        className="w-full resize-none rounded-md border border-neutral-200 bg-white p-2 text-sm outline-none focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:focus:border-neutral-600"
      />
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleDiscard}
          disabled={!draft}
          className="text-xs text-neutral-400 hover:text-neutral-600 disabled:pointer-events-none disabled:opacity-40 dark:text-neutral-500 dark:hover:text-neutral-300"
        >
          Discard
        </button>
        <Button
          type="button"
          size="sm"
          disabled={!draft.trim() || saving}
          onClick={handleSaveAsNote}
          className="gap-1.5"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : savedJustNow ? (
            <Check className="h-3.5 w-3.5" />
          ) : null}
          {savedJustNow ? "Saved" : "Save as note"}
        </Button>
      </div>
    </div>
  );
}
