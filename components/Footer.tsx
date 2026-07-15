function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12.001 2C6.478 2 2 6.477 2 12c0 1.876.52 3.63 1.42 5.128L2 22l4.996-1.396A9.95 9.95 0 0 0 12.001 22C17.523 22 22 17.523 22 12S17.523 2 12.001 2zm0 18.031a8 8 0 0 1-4.278-1.234l-.307-.187-3.155.882.86-3.075-.2-.316A7.996 7.996 0 1 1 20 12a7.996 7.996 0 0 1-7.999 8.031z" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.833.091-.647.35-1.088.636-1.339-2.221-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.269 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.338 1.909-1.295 2.747-1.026 2.747-1.026.546 1.378.203 2.397.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.848-2.337 4.695-4.566 4.943.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.744 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.523 2 12 2z" />
    </svg>
  );
}

const WHATSAPP_NUMBER_DISPLAY = "0348 4317628";
const WHATSAPP_LINK = "https://wa.me/923484317628";
const GITHUB_LINK = "https://github.com/UmerBrounrivaled";

export function Footer() {
  return (
    <footer className="mt-10 mb-16 border-t border-neutral-200 pt-6 text-sm dark:border-neutral-800 md:mb-0">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
        <p className="max-w-md text-neutral-500 dark:text-neutral-400">
          Tempo is a minimalist daily execution timer — plan your day, run focus
          sessions, and track your time in one clean, distraction-free space.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-neutral-500 dark:text-neutral-400">
          <span>
            Made by <span className="font-medium text-neutral-700 dark:text-neutral-300">UmerBro</span>
          </span>
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-neutral-900 dark:hover:text-neutral-50"
          >
            <WhatsAppIcon className="h-4 w-4" />
            {WHATSAPP_NUMBER_DISPLAY}
          </a>
          <a
            href={GITHUB_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-neutral-900 dark:hover:text-neutral-50"
          >
            <GitHubIcon className="h-4 w-4" />
            UmerBrounrivaled
          </a>
        </div>
      </div>
    </footer>
  );
}
