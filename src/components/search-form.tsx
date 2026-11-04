// Formulario de búsqueda (SEARCH-002). Es un GET puro a /search?q=: la consulta vive en la URL (atrás,
// adelante y recarga la conservan) y funciona sin JavaScript. Sin autocompletado ni analítica.
export function SearchForm({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form role="search" action="/search" method="get" className="flex gap-2">
      <label htmlFor="search-q" className="sr-only">
        Buscar encuestas
      </label>
      <input
        id="search-q"
        type="search"
        name="q"
        defaultValue={defaultValue}
        minLength={2}
        maxLength={100}
        required
        autoComplete="off"
        enterKeyHint="search"
        placeholder="Busca por pregunta"
        className="min-h-11 w-full rounded-xl border border-field bg-surface px-3.5 text-[15px] transition-colors hover:border-foreground focus:border-foreground"
      />
      <button
        type="submit"
        className="action-primary min-h-11 shrink-0 rounded-xl px-5 text-sm font-semibold"
      >
        Buscar
      </button>
    </form>
  );
}
