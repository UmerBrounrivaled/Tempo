"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { deleteNote } from "@/app/(app)/notes/actions";
import { X } from "lucide-react";

export function DeleteNoteButton({ noteId }: { noteId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  return (
    <button
      aria-label="Delete note"
      className="mr-1 hidden text-neutral-300 hover:text-red-500 group-hover:block dark:text-neutral-600"
      onClick={() =>
        startTransition(async () => {
          await deleteNote(noteId);
          if (searchParams.get("id") === noteId) {
            router.push("/notes");
          }
        })
      }
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}
