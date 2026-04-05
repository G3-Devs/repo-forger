
# 🔐 Fix Provisorio — Reset de OAuth para GitHub Organizations

## 📌 Contexto

Durante la implementación de autenticación con GitHub OAuth, se detectó que:

- La aplicación **no volvía a solicitar consentimiento**
- Solo se mostraban organizaciones previamente autorizadas
- No era posible seleccionar nuevas organizaciones

Esto se debe a que GitHub **cachea el consentimiento del usuario para la OAuth App**, impidiendo re-evaluar permisos sin intervención manual.

---

## 🎯 Objetivo del fix

Forzar a GitHub a:

- Revalidar permisos del usuario
- Permitir seleccionar nuevas organizaciones
- Actualizar correctamente el listado disponible en la aplicación

---

## 🛠️ Procedimiento aplicado (fix manual)

### 1. Ejecute la app en entorno local

```bash
npm run dev
```

Para acceder desde:

```
http://localhost:3000
```

---

### 2. Forcé re-consentimiento en OAuth

Modifiqué temporalmente el login en `page.tsx`:

```ts
signIn("github", {
  prompt: "consent",
});
```

Esto obliga a GitHub a ignorar la sesión previa y volver a solicitar permisos.

---

### 3. Cree branch de trabajo

```bash
git checkout -b resetOAuth
git push origin resetOAuth
```

---

### 4. Cambié callback URL en GitHub OAuth App

Fuí a:

👉 [https://github.com/settings/applications/[#####]](https://github.com/settings/applications/#####)

Para modificar:

```
Callback URL → http://localhost:3000/api/auth/callback/github
```

---

### 5. Para la re-autenticación completa

1. Cerrar sesión en la aplicación
2. Volver a iniciar sesión con GitHub
3. GitHub mostrará nuevamente el consentimiento
4. Seleccionar las organizaciones deseadas

---

### 6. Restauré configuración de producción

Volví a:

👉 [https://github.com/settings/applications/[#####]](https://github.com/settings/applications/#####)

Restauré:

```
Callback URL → https://mi-app.vercel.app/api/auth/callback/github
```

---

## ✅ Resultado

* Se regeneró correctamente el consentimiento OAuth
* Se actualizaron las organizaciones disponibles
* El selector de organizaciones muestra los valores correctos

---

## ⚠️ Limitaciones de este enfoque

* Es un proceso manual
* No escalable para múltiples usuarios
* Requiere acceso a configuración de OAuth App
* No aplicable directamente en producción sin intervención

---

## 🔮 Mejora futura (necesaria)

* Implementar estrategia de múltiples OAuth Apps (dev/prod)
* Evaluar migración a GitHub App (mejor control por organización)
* Agregar instrucción clara al usuario cuando no haya organizaciones visibles
* Automatizar detección de falta de permisos

---

## 🧠 Nota técnica

GitHub OAuth:

* Cachea consentimiento por usuario + aplicación
* No re-evalúa organizaciones automáticamente
* Requiere `prompt=consent` + cambio de callback para forzar nuevo flujo

---

## 📌 Estado

🎯 Fix aplicado manualmente
⚠️ Pendiente solución definitiva

