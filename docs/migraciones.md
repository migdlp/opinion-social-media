# Migraciones y tipos reproducibles

`supabase/migrations/*.sql` es la fuente versionada del esquema. Cada fichero
se aplica una sola vez por su versión en `supabase_migrations.schema_migrations`.
Los tipos públicos generados se guardan en
`src/lib/supabase/database.types.ts`; `database.typecheck.ts` comprueba las columnas
y los argumentos y retornos reales de las RPC durante `npm run typecheck`.

## Reproducción local y CI

Requiere Node.js 22, npm y Docker en ejecución. No requiere cuenta de Supabase,
token, contraseña alojada, `supabase login` ni `supabase link`.

```bash
npm ci
bash scripts/check-db-reproducibility.sh
```

La CLI fijada en 2.122.0 arranca sólo PostgreSQL de Supabase 17, con sus esquemas
Auth y roles reales. Un volumen limpio reproduce las migraciones durante el
arranque; `db push --local` aplica las pendientes por su historial. Las semillas
están deshabilitadas. La CI utiliza un runner y un volumen nuevos en cada job.

El script verifica que las versiones del historial coinciden con los SQL,
inserta una fila sintética y ejecuta un segundo `db push --local`. Exige que
el esquema (tablas, índices, políticas, permisos y funciones), el historial y
la fila permanezcan idénticos. Finalmente regenera los tipos desde esa base,
los compara con Git y ejecuta typecheck. Una diferencia hace fallar la CI.
Los marcadores `MVP022_TYPES_BEGIN/END` muestran sólo tipos del esquema público
para diagnosticar diferencias; no contienen credenciales ni registros.

Se puede repetir el comando sin borrar la base: no usa `db reset`, ni elimina
la base, ni reproduce SQL manualmente sobre un esquema existente. Reserva el
contenedor `supabase_db_opinion-social-media` para esta prueba: no usarlo para
datos personales. La fila sintética se elimina tras comprobar su conservación;
si falla antes, puede quedar hasta la siguiente ejecución.

Para detener el contenedor conservando datos:

```bash
npx --yes supabase@2.122.0 stop
```

La CI usa `stop --no-backup` al finalizar para destruir su volumen efímero.
Ese borrado es exclusivo de la base local de pruebas.

## Cambiar el esquema

Crear una migración nueva con `supabase migration new <nombre>`; no modificar
SQL que ya figure aplicado en un entorno compartido. Reproducirla localmente
y regenerar el artefacto con la misma CLI:

```bash
npx --yes supabase@2.122.0 db start
npx --yes supabase@2.122.0 db push --local --yes
npx --yes supabase@2.122.0 gen types --local --lang typescript --schema public > src/lib/supabase/database.types.ts
npx --no-install prettier --write src/lib/supabase/database.types.ts
bash scripts/check-db-reproducibility.sh
```

Versionar SQL, tipos y sus pruebas en la PR de la tarea. Si cambian las firmas
de la aplicación, escribir primero la prueba que falle y actualizar los
adaptadores y contratos correspondientes; no editar a mano el tipo generado.

Los tests SQL y de concurrencia existentes siguen en sus jobs con PostgreSQL
y un stub Auth. `scripts/db-test-local.sh` elimina su base de pruebas; **no es
un procedimiento de despliegue**. La prueba adicional de este documento usa
Supabase local real y el ledger, sin reemplazar esas suites.

Este procedimiento nunca despliega en Supabase alojado. Aplicar migraciones
en desarrollo o producción exige su tarea, reserva y conexión autorizadas;
seguir [acceso a Supabase](supabase-acceso.md) y el runbook de producción.

Referencias: [migraciones oficiales](https://supabase.com/docs/guides/deployment/database-migrations),
[CLI](https://supabase.com/docs/reference/cli/introduction) y
[generación de tipos](https://supabase.com/docs/guides/api/rest/generating-types).
