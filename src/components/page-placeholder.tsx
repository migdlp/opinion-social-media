type PagePlaceholderProps = {
  title: string;
  children?: React.ReactNode;
};

// Contenido provisional de las rutas base hasta que sus tareas las implementen.
export function PagePlaceholder({ title, children }: PagePlaceholderProps) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {children}
    </div>
  );
}
