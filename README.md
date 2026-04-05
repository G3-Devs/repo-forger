# 🧩 Generador de Repos GitHub para Cátedra

![Estado](https://img.shields.io/badge/estado-MVP%20funcional-success)

![Uso](https://img.shields.io/badge/uso-cursada%20real-blue)

![Stack](https://img.shields.io/badge/stack-Nextjs%20%7C%20Tailwind%20%7C%20GitHub%20API-yellow)

![Licencia](https://img.shields.io/badge/licencia-uso%20educativo-lightgrey)

Herramienta web para crear repositorios de estudiantes en masa a partir de un template y asignar permisos automáticamente.

Diseñada como alternativa práctica a los problemas de confiabilidad de GitHub Classroom en cursos con alta cantidad de alumnos.

---

## ✨ Funcionalidades

- ✅ Creación automática de repositorios por alumno
- ✅ Naming consistente (`tp1-usuario`)
- ✅ Uso de repositorio template
- ✅ Invitación automática con permisos de escritura
- ✅ Manejo de repos existentes (idempotente)
- ✅ Control de errores por usuario
- ✅ Interfaz web simple y rápida (modo oscuro)
- ✅ Login con GitHub (OAuth)
- ✅ Selección de organización desde la UI
- ✅ Ejecución local sin dependencias externas

---

## 🖼️ Vista general

Interfaz web donde el docente:

1. Inicia sesión con GitHub
2. Selecciona una organización autorizada
3. Define template y prefijo
4. Ingresa lista de usuarios
5. Ejecuta el proceso
6. Obtiene resultados por alumno (OK / ERROR)

---

## 🚀 Instalación

1. Clonar el repositorio:

```bash
git clone <repo-url>
cd <repo>
```

2. Instalar dependencias:

```bash
npm install
```

---

# 📌 Requisitos

## 🔐 Opción 1 — OAuth (recomendado)

* No requiere token manual
* Cada docente usa sus propios permisos
* Necesita configurar una GitHub OAuth App

### Variables de entorno

```env
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...
```

---

## 🔐 Opción 2 — Token (fallback)

### GitHub Fine-Grained Token (Organización)

1. Ir a [https://github.com/settings/tokens](https://github.com/settings/tokens)

2. Click en **Generate new token (fine-grained)**

3. Configurar:

   * **Resource owner** → seleccionar la organización
   * **Repository access** → All repositories

4. Permisos:

   **Repository permissions**

   * Contents → Read & Write
   * Administration → Read & Write

   **Organization permissions**

   * Members → Read

5. Generar el token y copiarlo

6. Aprobar el token en la organización (si aplica)

⚠️ **IMPORTANTE:** El usuario debe ser owner/admin de la organización

---

## 🔐 Configuración

Crear archivo:

```
.env.local
```

Agregar (solo si usás token):

```
GITHUB_TOKEN=tu_token
```

---

## ▶️ Ejecución

```bash
npm run dev
```

Abrir en:

```
http://localhost:3000
```

---

## 🎯 Uso

1. Iniciar sesión con GitHub

2. Seleccionar organización desde el selector

3. Completar:

   * **Repo template** (ej: `tp1-template`)
   * **Prefijo** (ej: `tp1`)

4. Ingresar usuarios (uno por línea):

```
usuario1
usuario2
usuario3
```

5. Click en:

👉 **"Crear repos + invitar"**

---

## 🔄 Comportamiento

Para cada usuario:

1. Se crea el repositorio:

```
[prefijo]-[usuario]
```

2. Basado en el template indicado

3. Se espera disponibilidad del repo (evita errores de timing)

4. Se envía invitación con permisos `push`

---

## ⚠️ Consideraciones importantes

* El repo template debe estar marcado como **Template Repository**
* Las organizaciones deben autorizar la OAuth App para ser visibles
* Los usuarios deben existir en GitHub
* Si el repo ya existe, no se recrea (comportamiento seguro)
* No ejecutar múltiples veces sin revisar resultados
* GitHub puede tener pequeñas demoras en la creación de repos (ya contemplado)

---

## 🧱 Stack

* Next.js (App Router)
* TailwindCSS
* NextAuth (OAuth GitHub)
* GitHub REST API

---

## 📁 Estructura del proyecto

```
/app
 ├── page.tsx              # UI principal
 ├── api/process           # Creación + invitaciones
 ├── api/orgs              # Obtención de organizaciones
 └── api/auth              # OAuth (NextAuth)
```

---

## 📌 Estado del proyecto

MVP funcional en uso real:

* Creación de repos ✔
* Invitaciones ✔
* UI funcional ✔
* Manejo de errores ✔
* OAuth GitHub ✔
* Selector de organizaciones ✔

Pendiente:

* Carga de CSV
* Validación automática de usuarios
* Exportación de resultados

---

## 🧑‍🏫 Uso recomendado

Cada docente puede:

1. Clonar el repositorio
2. Ejecutar localmente
3. Iniciar sesión con GitHub
4. Seleccionar su organización
5. Generar repos sin depender de GitHub Classroom

---

## 🤝 Créditos y agradecimientos

Este proyecto surge en el ámbito de la **Universidad Nacional de Hurlingham (UNaHur)**, a partir de un problema real al utilizar GitHub Classroom en cursos con gran cantidad de estudiantes.
En particular, las fallas en la generación de invitaciones (errores 500, accesos incompletos y repositorios duplicados) generaban una sobrecarga operativa significativa para el equipo docente, obligando a intervenir manualmente en cientos de casos.

Aportes clave:
💡 Esta es la evolución de una solución previa desarrollada en Python por [**Hernán Coniglio**](https://github.com/hernanconiglio), cuyo trabajo original fue fundamental para identificar el problema y establecer una primera automatización para mitigar estos inconvenientes.

A partir de esa base, se desarrolló esta versión, orientada a mejorar la usabilidad, reducir la intervención manual y escalar la solución de forma confiable en contextos reales de cursadas numerosas.

---

## 🤝 Contribuciones

Se aceptan mejoras orientadas a uso real:

* UI/UX
* Validaciones
* Automatización (CSV / integraciones)
* Robustez ante errores

Pasos:

1. Fork del repositorio
2. Crear rama (`feature/...`)
3. Commit claro
4. Pull Request

---

## 🧠 Enfoque del proyecto

Esta herramienta está diseñada como:

* ✔ Solución práctica y directa
* ✔ Uso real en entornos educativos
* ✔ Código simple y mantenible
* ✔ Alternativa robusta a herramientas inestables

---

## 📣 Nota

Este proyecto surge a partir de problemas reales en el uso de GitHub Classroom en cursos con gran cantidad de alumnos, donde errores en la asignación automática generan sobrecarga operativa significativa.

La solución prioriza confiabilidad, control y simplicidad.

---

## 📄 Licencia

Uso interno / educativo. Adaptar según necesidad.

---

## 🙌 Autor

Desarrollado como herramienta de soporte docente para mejorar la gestión de trabajos prácticos en entornos de programación.

---