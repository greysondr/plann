-- La verificación de organizador (sección 3.2) pide cédula o RIF; la tabla
-- organizers no tenía dónde guardarlo.
alter table public.organizers add column if not exists legal_document text;
