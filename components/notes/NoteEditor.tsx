"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { saveNote } from "@/app/(app)/notes/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bold, Italic, List, CheckSquare } from "lucide-react";

type Note = {
  id: string;
  title: string | null;
  content: JSONContent | null;
};

export function NoteEditor({ note }: { note: Note }) {
  const [title, setTitle] = useState(note.title ?? "");
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [StarterKit, TaskList, TaskItem.configure({ nested: true })],
    content: note.content ?? "",
    immediatelyRender: false,
    onUpdate: () => scheduleSave(),
  });

  function scheduleSave() {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      if (!editor) return;
      await saveNote(note.id, { title, content: editor.getJSON() });
      setSavedAt(new Date().toLocaleTimeString());
    }, 800);
  }

  useEffect(() => {
    scheduleSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, []);

  if (!editor) return null;

  return (
    <div className="flex flex-col gap-3">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Note title"
        className="border-none px-0 text-xl font-semibold shadow-none focus-visible:ring-0"
      />

      <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-800 pb-2">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        >
          <CheckSquare className="h-4 w-4" />
        </Button>
      </div>

      <EditorContent
        editor={editor}
        className="prose prose-neutral min-h-[300px] max-w-none text-sm focus:outline-none [&_.ProseMirror]:min-h-[300px] [&_.ProseMirror]:outline-none"
      />

      <p className="text-xs text-neutral-400 dark:text-neutral-500">
        {savedAt ? `Saved at ${savedAt}` : "All changes saved automatically"}
      </p>
    </div>
  );
}
