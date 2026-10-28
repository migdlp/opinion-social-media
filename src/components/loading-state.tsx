type LoadingStateProps = {
  label?: string;
};

// Estado de carga accesible: se anuncia a lectores de pantalla y muestra texto
// visible para que la página no parezca vacía mientras llegan los datos.
export function LoadingState({ label = "Cargando…" }: LoadingStateProps) {
  return (
    <div role="status" className="flex items-center gap-3 py-8 text-muted">
      <span
        aria-hidden="true"
        className="size-5 animate-spin rounded-full border-2 border-border border-t-foreground dark:border-t-accent motion-reduce:animate-none"
      />
      <span>{label}</span>
    </div>
  );
}
