# Generador de Repos para Cátedra

Herramienta interna para crear repositorios de estudiantes en masa a partir de un template y asignarles permisos automáticamente.

## 🚀 Objetivo

Reemplazar el flujo inestable de GitHub Classroom por un proceso controlado:

- Crear repos: `tp1-usuario`
- Basados en un template
- Invitar automáticamente a cada alumno
- Evitar errores 500, duplicados y reprocesos manuales

---

## ⚙️ Requisitos

- Node.js 18+
- Cuenta de GitHub con permisos sobre la organización
- Token de GitHub con permisos `repo`

---

## 🔐 Configuración

Crear archivo:

```

.env.local

```

Agregar:

```

GITHUB_TOKEN=tu_token

````

> El token debe tener acceso a la organización y permisos para crear repos e invitar colaboradores.

---

## ▶️ Ejecución local

```bash
npm install
npm run dev
````

Abrir en navegador:

```
http://localhost:3000
```

---

## 🧪 Uso

1. Completar:

   * Organización
   * Repo template (debe estar marcado como template en GitHub)
   * Prefijo (ej: `tp1`)

2. Ingresar usuarios (uno por línea):

```
usuario1
usuario2
usuario3
```

3. Click en **"Crear repos + invitar"**

---

## 🔄 Comportamiento

Para cada usuario:

1. Se crea el repo:

```
[prefijo]-[usuario]
```

2. Se basa en el template indicado

3. Se envía invitación con permisos de escritura

---

## ⚠️ Consideraciones

* Si el repo ya existe, no falla (idempotente)
* No volver a ejecutar con los mismos usuarios sin revisar resultados
* Los usuarios deben existir en GitHub

---

## 🧱 Stack

* Next.js (App Router)
* TailwindCSS
* GitHub REST API

---

## 📌 Estado del proyecto

MVP funcional:

* Creación de repos ✔
* Invitaciones ✔
* UI básica ✔

Pendiente:

* OAuth GitHub
* Carga CSV
* Validación de usuarios
* Reportes exportables

---

## 🧑‍🏫 Uso recomendado

Cada docente puede:

1. Clonar el repositorio
2. Configurar su token
3. Ejecutar localmente

---

## 📣 Nota

Esta herramienta surge como alternativa a limitaciones prácticas de GitHub Classroom en contextos de alta escala (cursos numerosos).

---
