"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createNote } from "@/app/(app)/notes/actions";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function NewNoteButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      className="w-full justify-start gap-2"
      onClick={() =>
        startTransition(async () => {
          const id = await createNote(null);
          if (id) router.push(`/notes?id=${id}`);
        })
      }
    >
      <Plus className="h-4 w-4" />
      New note
    </Button>
  );
}
