import Link from "next/link";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: { href: string; label: string };
};

// Estado vacío: explica qué pasa y ofrece un siguiente paso útil.
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <section className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-surface px-5 py-8">
      <h2 className="text-[17px] font-semibold tracking-[-0.01em]">{title}</h2>
      <p className="text-muted">{description}</p>
      {action && (
        <Link
          href={action.href}
          className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-85"
        >
          {action.label}
        </Link>
      )}
    </section>
  );
}
