-- =====================================================
-- MIGRACIÓN SQL - PLATAFORMA CLASES PARTICULARES
-- Base de datos: Supabase (PostgreSQL)
-- =====================================================

-- =============
-- TABLAS
-- =============

-- Profesores
CREATE TABLE IF NOT EXISTS profesores (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100),
  email VARCHAR(200),
  telefono VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Niveles Educativos
CREATE TABLE IF NOT EXISTS niveles_educativos (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Materias
CREATE TABLE IF NOT EXISTS materias (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Niveles de Aprendizaje (Materia + Nivel Educativo)
CREATE TABLE IF NOT EXISTS niveles_aprendizaje (
  id BIGSERIAL PRIMARY KEY,
  materia_id BIGINT NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  nivel_educativo_id BIGINT NOT NULL REFERENCES niveles_educativos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(materia_id, nivel_educativo_id)
);

-- Apartados (dentro de un Nivel de Aprendizaje)
CREATE TABLE IF NOT EXISTS apartados (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  nivel_aprendizaje_id BIGINT NOT NULL REFERENCES niveles_aprendizaje(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Módulos (dentro de un Apartado)
CREATE TABLE IF NOT EXISTS modulos (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  apartado_id BIGINT NOT NULL REFERENCES apartados(id) ON DELETE CASCADE,
  modulo_padre_id BIGINT REFERENCES modulos(id) ON DELETE CASCADE,
  orden INT NOT NULL DEFAULT 1,
  requiere_entrega BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Archivos (material didáctico adjunto a módulos)
CREATE TABLE IF NOT EXISTS archivos (
  id BIGSERIAL PRIMARY KEY,
  modulo_id BIGINT NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
  nombre VARCHAR(300) NOT NULL,
  tipo VARCHAR(100),
  url TEXT,
  storage_path TEXT,
  tamano BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alumnos
CREATE TABLE IF NOT EXISTS alumnos (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  telefono VARCHAR(50),
  email VARCHAR(200),
  direccion TEXT,
  nivel_aprendizaje_id BIGINT REFERENCES niveles_aprendizaje(id) ON DELETE SET NULL,
  estado VARCHAR(20) DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO','CLASE_PENDIENTE','CICLO_CUMPLIDO','ABANDONO')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progreso del alumno por módulo
CREATE TABLE IF NOT EXISTS progreso_alumno_modulo (
  id BIGSERIAL PRIMARY KEY,
  alumno_id BIGINT NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  modulo_id BIGINT NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
  completado BOOLEAN DEFAULT FALSE,
  fecha_marcado TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(alumno_id, modulo_id)
);

-- Precios por Nivel de Aprendizaje
CREATE TABLE IF NOT EXISTS precios_config (
  id BIGSERIAL PRIMARY KEY,
  nivel_aprendizaje_id BIGINT NOT NULL REFERENCES niveles_aprendizaje(id) ON DELETE CASCADE UNIQUE,
  precio_por_hora DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clases
CREATE TABLE IF NOT EXISTS clases (
  id BIGSERIAL PRIMARY KEY,
  alumno_id BIGINT NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  nivel_aprendizaje_id BIGINT REFERENCES niveles_aprendizaje(id) ON DELETE SET NULL,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  duracion_horas DECIMAL(4,2) NOT NULL DEFAULT 1,
  estado VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','DICTADA','CANCELADA')),
  costo_calculado DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pagos
CREATE TABLE IF NOT EXISTS pagos (
  id BIGSERIAL PRIMARY KEY,
  clase_id BIGINT REFERENCES clases(id) ON DELETE SET NULL,
  alumno_id BIGINT NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  monto DECIMAL(12,2) NOT NULL,
  tipo_pago VARCHAR(30) NOT NULL CHECK (tipo_pago IN ('EFECTIVO','TRANSFERENCIA','TARJETA')),
  fecha DATE NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Señas (pagos anticipados)
CREATE TABLE IF NOT EXISTS senas (
  id BIGSERIAL PRIMARY KEY,
  alumno_id BIGINT NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  monto DECIMAL(12,2) NOT NULL,
  fecha DATE NOT NULL,
  aplicada BOOLEAN DEFAULT FALSE,
  clase_id_aplicada BIGINT REFERENCES clases(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deudas
CREATE TABLE IF NOT EXISTS deudas (
  id BIGSERIAL PRIMARY KEY,
  alumno_id BIGINT NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  clase_id BIGINT REFERENCES clases(id) ON DELETE SET NULL,
  monto_original DECIMAL(12,2) NOT NULL,
  monto_pendiente DECIMAL(12,2) NOT NULL,
  fecha DATE NOT NULL,
  estado VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','PARCIAL','SALDADA')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat (mensajes directos)
CREATE TABLE IF NOT EXISTS mensajes_chat (
  id BIGSERIAL PRIMARY KEY,
  alumno_id BIGINT NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  contenido TEXT NOT NULL,
  es_de_profesor BOOLEAN DEFAULT FALSE,
  leido BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Foro - Consultas
CREATE TABLE IF NOT EXISTS consultas_foro (
  id BIGSERIAL PRIMARY KEY,
  alumno_id BIGINT NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  nivel_aprendizaje_id BIGINT NOT NULL REFERENCES niveles_aprendizaje(id) ON DELETE CASCADE,
  apartado_id BIGINT REFERENCES apartados(id) ON DELETE CASCADE,
  modulo_id BIGINT REFERENCES modulos(id) ON DELETE CASCADE,
  titulo VARCHAR(300) NOT NULL,
  contenido TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Foro - Respuestas
CREATE TABLE IF NOT EXISTS respuestas_foro (
  id BIGSERIAL PRIMARY KEY,
  consulta_id BIGINT NOT NULL REFERENCES consultas_foro(id) ON DELETE CASCADE,
  alumno_id BIGINT REFERENCES alumnos(id) ON DELETE SET NULL,
  contenido TEXT NOT NULL,
  es_de_profesor BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
  id BIGSERIAL PRIMARY KEY,
  alumno_id BIGINT NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Entregas de alumnos (tareas)
CREATE TABLE IF NOT EXISTS entregas_alumno (
  id BIGSERIAL PRIMARY KEY,
  alumno_id BIGINT NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  modulo_id BIGINT NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
  nombre_archivo VARCHAR(300),
  url TEXT,
  storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============
-- ROW LEVEL SECURITY (RLS)
-- =============

ALTER TABLE profesores ENABLE ROW LEVEL SECURITY;
ALTER TABLE niveles_educativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE materias ENABLE ROW LEVEL SECURITY;
ALTER TABLE niveles_aprendizaje ENABLE ROW LEVEL SECURITY;
ALTER TABLE apartados ENABLE ROW LEVEL SECURITY;
ALTER TABLE modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE archivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE progreso_alumno_modulo ENABLE ROW LEVEL SECURITY;
ALTER TABLE precios_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE clases ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE senas ENABLE ROW LEVEL SECURITY;
ALTER TABLE deudas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultas_foro ENABLE ROW LEVEL SECURITY;
ALTER TABLE respuestas_foro ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE entregas_alumno ENABLE ROW LEVEL SECURITY;

-- Profesor: acceso total a todas las tablas
-- (Simplificación: el profesor es el auth user que tiene registro en profesores)

CREATE POLICY "Profesores full access" ON profesores FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Profesor manages niveles_educativos" ON niveles_educativos FOR ALL USING (true);
CREATE POLICY "Profesor manages materias" ON materias FOR ALL USING (true);
CREATE POLICY "Profesor manages niveles_aprendizaje" ON niveles_aprendizaje FOR ALL USING (true);
CREATE POLICY "Profesor manages apartados" ON apartados FOR ALL USING (true);
CREATE POLICY "Profesor manages modulos" ON modulos FOR ALL USING (true);
CREATE POLICY "Profesor manages archivos" ON archivos FOR ALL USING (true);
CREATE POLICY "Profesor manages alumnos" ON alumnos FOR ALL USING (true);
CREATE POLICY "Profesor manages progreso" ON progreso_alumno_modulo FOR ALL USING (true);
CREATE POLICY "Profesor manages precios" ON precios_config FOR ALL USING (true);
CREATE POLICY "Profesor manages clases" ON clases FOR ALL USING (true);
CREATE POLICY "Profesor manages pagos" ON pagos FOR ALL USING (true);
CREATE POLICY "Profesor manages senas" ON senas FOR ALL USING (true);
CREATE POLICY "Profesor manages deudas" ON deudas FOR ALL USING (true);
CREATE POLICY "Profesor manages chat" ON mensajes_chat FOR ALL USING (true);
CREATE POLICY "Profesor manages foro consultas" ON consultas_foro FOR ALL USING (true);
CREATE POLICY "Profesor manages foro respuestas" ON respuestas_foro FOR ALL USING (true);
CREATE POLICY "Profesor manages notificaciones" ON notificaciones FOR ALL USING (true);
CREATE POLICY "Profesor manages entregas" ON entregas_alumno FOR ALL USING (true);

-- =============
-- STORAGE BUCKETS
-- =============
-- Run these in the Supabase Dashboard > Storage:
-- 1. Create bucket: material-didactico (public)
-- 2. Create bucket: entregas-alumnos (public)

-- =============
-- REALTIME
-- =============
-- Enable Realtime for chat and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE mensajes_chat;
ALTER PUBLICATION supabase_realtime ADD TABLE notificaciones;
ALTER PUBLICATION supabase_realtime ADD TABLE consultas_foro;
ALTER PUBLICATION supabase_realtime ADD TABLE respuestas_foro;
