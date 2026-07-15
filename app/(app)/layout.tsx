import Link from "next/link";
import { logout } from "../(auth)/actions";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { Footer } from "@/components/Footer";
import { TimerEngine } from "@/components/timer/TimerEngine";
import { FocusWidget } from "@/components/focus/FocusWidget";
import { ProjectSwitcher } from "@/components/projects/ProjectSwitcher";
import { ProjectGate } from "@/components/projects/ProjectGate";
import { listProjects, getActiveProject } from "./projects/actions";
import { getIncompleteTasks } from "./focus/actions";
import { createClient } from "@/lib/supabase/server";
import {
  ListTodo,
  Timer,
  NotebookText,
  History,
  Settings,
  LogOut,
} from "lucide-react";

const NAV = [
  { href: "/today", label: "Today", icon: ListTodo },
  { href: "/focus", label: "Focus", icon: Timer },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/notes", label: "Notes", icon: NotebookText },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("sound_on_session_end, auto_start_break")
    .eq("id", user?.id ?? "")
    .single();

  const [projects, activeProject, tasks] = await Promise.all([
    listProjects(),
    getActiveProject(),
    getIncompleteTasks(),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 dark:bg-neutral-950 md:flex-row">
      <KeyboardShortcuts />
      <TimerEngine
        soundOnSessionEnd={profile?.sound_on_session_end ?? true}
        autoStartBreak={profile?.auto_start_break ?? true}
      />
      <FocusWidget tasks={tasks ?? []} />

      {/* Desktop sidebar */}
      <aside className="hidden w-56 flex-col border-r border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950 md:flex">
        <div className="mb-3 px-2 text-lg font-semibold">Tempo</div>
        <div className="mb-4">
          {activeProject && (
            <ProjectSwitcher projects={projects} activeProjectId={activeProject.id} />
          )}
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <ThemeToggle />
        <form action={logout}>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </form>
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950 md:hidden">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">Tempo</span>
          {activeProject && (
            <ProjectSwitcher projects={projects} activeProjectId={activeProject.id} />
          )}
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle iconOnly />
          <form action={logout}>
            <Button variant="ghost" size="icon" aria-label="Log out">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </header>

      <main className="flex-1 p-4 pb-20 md:p-8 md:pb-8">
        {activeProject ? children : <ProjectGate projects={projects} />}
        <Footer />
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t border-neutral-200 bg-white py-2 dark:border-neutral-800 dark:bg-neutral-950 md:hidden">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-0.5 px-2 py-1 text-neutral-500 dark:text-neutral-400"
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px]">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
