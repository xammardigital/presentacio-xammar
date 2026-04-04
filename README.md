# Presentacions Interactives Xammar 🚀

Una plataforma de presentacions en temps real construïda amb **Next.js**, **Convex** i **Tailwind CSS**. Permet a un presentador controlar què veuen els usuaris en els seus dispositius i rebre feedback instantani a través d'enquestes.

## 🛠️ Tecnologies Utilitzades

- **Frontend:** [Next.js](https://nextjs.org/) (App Router)
- **Backend Realtime:** [Convex](https://www.convex.dev/) (Base de dades i funcions reactives)
- **Estils:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Animacions:** [Framer Motion](https://www.framer.com/motion/)
- **Icones:** [Lucide React](https://lucide.dev/)

---

## 🚀 Com Començar

Segueix aquests passos per posar en marxa el projecte a la teva màquina local:

### 1. Instal·lar dependències
```bash
npm install
```

### 2. Configurar el Backend (Convex)
Executa el servidor de desenvolupament de Convex. Si és la primera vegada, et demanarà iniciar la sessió o crear un compte:
```bash
npx convex dev
```
*Això generarà automàticament el teu fitxer `.env.local` amb les claus necessàries.*

### 3. Configurar Seguretat (Admin Token)
Aquesta plataforma utilitza un token de seguretat per a les accions d'administrador. 
1. Crea un fitxer `.env.local` (si no s'ha creat) a partir de `.env.example`.
2. Defineix una clau secreta a `ADMIN_TOKEN`.
3. **Molt important:** Afegeix aquesta mateixa clau al teu **Convex Dashboard** (Settings > Environment Variables) amb el nom `ADMIN_TOKEN`.

### 4. Iniciar el servidor de Next.js
En una **nova terminal** (mantenint la de Convex oberta), executa:
```bash
npm run dev
```
L'aplicació estarà disponible a [http://localhost:3000](http://localhost:3000).

---

## 📱 Com funciona la plataforma?

### 👑 Panell d'Administració (`/admin`)
És el centre de control del presentador.
- **Crear Passos:** Afegeix pantalles de tipus `BIENVENIDA`, `TEXTO` o `ENCUESTA`.
- **Activar:** En prémer el botó "ACTIVAR" d'un pas, tots els dispositius connectats canviaran a aquest contingut a l'instant.
- **Resultats Live:** Si el pas actiu és una enquesta, veuràs un gràfic de barres que s'actualitza en viu amb cada vot.

### 👥 Vista del Públic (`/`)
La interfície que veuen els assistents (ideal per a mòbils).
- **Sincronització:** Escolta l'estat global i transiciona automàticament.
- **Votació:** Permet votar en enquestes. Un cop l'usuari vota, la interfície es bloqueja visualment per evitar vots duplicats accidentals.
- **Anonimat:** No es guarden IPs ni dades personals.

---

## 📁 Estructura del Projecte

```text
├── convex/             # Esquema de base de dades i funcions del backend
│   ├── schema.ts       # Definició de taules (steps, presentationState)
│   ├── steps.ts        # Lògica per crear, esborrar i votar
│   └── presentation.ts # Gestió de l'estat actiu de la presentació
├── src/
│   ├── app/            # Rutes i pàgines de Next.js
│   │   ├── admin/      # Panell d'administració
│   │   ├── page.tsx    # Vista pública principal
│   │   └── layout.tsx  # Layout arrel i temes
│   └── components/     # Components compartits i proveïdors
└── README.md           # Aquest fitxer
```

---

## 🎨 Disseny i Personalització

El projecte utilitza el sistema de disseny oficial de **Xammar Digital**. Pots personalitzar-lo fàcilment:
- **Colors i Tipografia:** Modifica `src/app/globals.css`. 
- **Textos de Marca:** Canvia el títol de la web a `src/app/layout.tsx`.

## 🔒 Seguretat i Privadesa

El projecte està configurat seguint una arquitectura **Zero-Trust**:
- Les claus privades de Convex i el `ADMIN_TOKEN` **mai es publiquen a GitHub** (estat protegit per `.gitignore`).
- Totes les mutacions sensibles al backend verifiquen el token abans d'executar-se.

---

## 📄 Llicència

Aquest projecte està sota la llicència **MIT**. Ets lliure d'utilitzar-lo, modificar-lo i distribuir-lo per a qualsevol propòsit. ✨
