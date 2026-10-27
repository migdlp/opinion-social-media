import Link from "next/link";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: { href: string; label: string };
};

// Estado vacío: explica qué pasa y ofrece un siguiente paso útil.
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <section className="flex flex-col items-start gap-3 rounded-lg border border-border px-4 py-8">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-muted">{description}</p>
      {action && (
        <Link
          href={action.href}
          className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90"
        >
          {action.label}
        </Link>
      )}
    </section>
  );
}
