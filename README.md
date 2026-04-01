# Presentaciones Interactivas Xammar 🚀

Una plataforma de presentaciones en tiempo real construida con **Next.js**, **Convex** y **Tailwind CSS**. Permite a un presentador controlar qué ven los usuarios en sus dispositivos y recibir feedback instantáneo a través de encuestas.

## 🛠️ Tecnologías Utilizadas

- **Frontend:** [Next.js](https://nextjs.org/) (App Router)
- **Backend Realtime:** [Convex](https://www.convex.dev/) (Base de datos y funciones reactivas)
- **Estilos:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Animaciones:** [Framer Motion](https://www.framer.com/motion/)
- **Iconos:** [Lucide React](https://lucide.dev/)

---

## 🚀 Cómo Empezar

Sigue estos pasos para poner en marcha el proyecto en tu máquina local:

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar el Backend (Convex)
Ejecuta el servidor de desarrollo de Convex. Si es la primera vez, te pedirá iniciar sesión o crear una cuenta:
```bash
npx convex dev
```
*Esto generará automáticamente tu archivo `.env.local` con las claves necesarias.*

### 3. Iniciar el servidor de Next.js
En una **nueva terminal** (manteniendo la de Convex abierta), ejecuta:
```bash
npm run dev
```
La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

---

## 📱 ¿Cómo funciona la plataforma?

### 👑 Panel de Administración (`/admin`)
Es el centro de control para el presentador.
- **Crear Pasos:** Añade pantallas de tipo `BIENVENIDA`, `TEXTO` o `ENCUESTA`.
- **Activar:** Al pulsar el botón "ACTIVAR" de un paso, todos los dispositivos conectados cambiarán a ese contenido al instante.
- **Resultados Live:** Si el paso activo es una encuesta, verás un gráfico de barras que se actualiza en vivo con cada voto.

### 👥 Vista del Público (`/`)
La interfaz que ven los asistentes (ideal para móviles).
- **Sincronización:** Escucha el estado global y transiciona automáticamente.
- **Votación:** Permite votar en encuestas. Una vez que el usuario vota, la interfaz se bloquea visualmente para evitar votos duplicados accidentales.
- **Anonimato:** No se guardan IPs ni datos personales.

---

## 📁 Estructura del Proyecto

```text
├── convex/             # Esquema de base de datos y funciones del backend
│   ├── schema.ts       # Definición de tablas (steps, presentationState)
│   ├── steps.ts        # Lógica para crear, borrar y votar
│   └── presentation.ts # Gestión del estado activo de la presentación
├── src/
│   ├── app/            # Rutas y páginas de Next.js
│   │   ├── admin/      # Panel de administración
│   │   ├── page.tsx    # Vista pública principal
│   │   └── layout.tsx  # Layout raíz y temas
│   └── components/     # Componentes compartidos y proveedores
└── README.md           # Este archivo
```

---

## 🎨 Diseño y Personalización

El proyecto utiliza un sistema de **Modo Oscuro** (Deep Slate/Indigo) con efectos de **Glassmorphism**. Puedes ajustar los colores y estilos globales en `src/app/globals.css`.

¡Disfruta de tus presentaciones interactivas! 🎤✨
