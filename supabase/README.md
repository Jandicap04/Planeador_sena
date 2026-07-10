# Supabase setup

This folder contains the SQL needed to recreate the schema shown in the visualizer and to support the Planeador autocomplete.

## Files

- `schema.sql`: base tables, indexes, and an optional join view.
- `instructores_seed.sql`: seed de instructores con `id`, `nombre_completo`, `usuario` y `correo_electronico`.

## How to use

1. Open your Supabase project.
2. Go to the SQL editor.
3. Paste and run `schema.sql`.
4. Import your CSV data into `programa` and `competencia`.
5. Fill `programa_competencia` with the relationship rows.
6. Run `instructores_seed.sql` to load the instructors catalog.
7. Add your frontend credentials in `frontend/.env` from `frontend/.env.example`.

## Frontend env vars

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROGRAMAS_TABLE`

## Login lookup

For login or validation flows, use `public.buscar_instructor_acceso(termino)` or query `public.v_instructores_acceso` / `public.instructores` by:

- `usuario`
- `nombre_completo`
- `correo_electronico`

This allows login by instructor code/name/email when you wire the backend or a Supabase-based auth flow.

The application currently calls the reusable SQL function first and falls back to a direct query if the function is not deployed yet.
