type PagePlaceholderProps = {
  title: string;
  children?: React.ReactNode;
};

// Contenido provisional de las rutas base hasta que sus tareas las implementen.
export function PagePlaceholder({ title, children }: PagePlaceholderProps) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {children}
    </main>
  );
}
