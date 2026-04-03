# 🛡️ AI Security & Dependency Guidelines (v2.0)

Este documento define las políticas de seguridad obligatorias. La IA debe validar cualquier sugerencia contra estas reglas antes de proponer cambios.

## 1. Gestión de Dependencias (Supply Chain Security)
- **Versiones Exactas:** Prohibido el uso de `^` o `~`. Todas las versiones deben ser fijas.
- **Cuarentena:** No instales versiones publicadas hace menos de 24 horas.
- **Bloqueo de Scripts:** Priorizar comandos con `--ignore-scripts`.
- **Gestor Preferente:** Usar `pnpm` (bloquea hooks nativamente).

## 2. Configuración del Entorno (.npmrc)
Cualquier `.npmrc` debe incluir:
```ini
ignore-scripts=true
save-exact=true
min-release-age=1440
```

## 3. Prevención de Exfiltración de Datos
- **Variables de Entorno:** Nunca hardcodear credenciales. Validar siempre el `.gitignore`.
- **Código Nativo:** Antes de añadir una librería pequeña, evaluar si se puede resolver con Web APIs nativas.
- **Zero-Telemetry:** Deshabilitar cualquier opción de telemetría en librerías de terceros si está disponible.

## 4. Auditoría Continua
- Ejecutar `pnpm audit` tras cada nueva dependencia.

## 5. OpSec y Privacidad del Sistema (Novedad ✨)
- **Rutas Agnósticas:** Prohibido el uso de rutas absolutas (ej. `/Users/usuario/...`). Todo debe ser relativo al proyecto o usar variables de entorno de sistema.
- **Limpieza de Metadatos:** La IA no debe generar ni sugerir archivos con información del sistema operativo (como `.DS_Store` o temporales de compilación).
- **Agnosticismo de Máquina:** El código debe ser funcional en cualquier máquina sin revelar la estructura de directorios del autor original.

## 6. Seguridad de Comunicación Local (Tauri/Sidecar) (Novedad ✨)
- **Binding Estricto:** Cualquier servidor backend (FastAPI/Python) debe hacer el bind exclusivamente a `127.0.0.1`. Prohibido el uso de `0.0.0.0`.
- **CSP (Content Security Policy):** No usar comodines (`*`). Solo permitir conexiones a `self` y a los puertos específicos del backend local.
- **CORS Whitelist:** Solo permitir orígenes de la propia App (`tauri://localhost`) y el puerto de desarrollo local.