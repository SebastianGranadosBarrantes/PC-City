# Guía de Conexión a Firebase Firestore (GCP) para Ciudad PC

Ciudad PC incluye un **módulo multijugador por sesiones** para que los estudiantes jueguen en sus propios dispositivos en el aula o virtualmente y compitan en tiempo real por el **chocolate** 🍫.

El sistema funciona con **Google Cloud Firestore (100% gratuito)** y cuenta con modo **simulado local** automático mientras no se configuren las claves.

---

## 🚀 Paso a Paso: Configurar Firebase (3 minutos)

### 1. Crear el proyecto gratuito en Firebase
1. Ingresa a la consola de Firebase: **[console.firebase.google.com](https://console.firebase.google.com/)** con tu cuenta de Google.
2. Haz clic en **"Agregar proyecto"** y nómbralo (por ejemplo, `ciudad-pc-educativo`).
3. Puedes deshabilitar Google Analytics para simplificar, y haz clic en **"Crear proyecto"**.

### 2. Habilitar Cloud Firestore
1. En el menú lateral izquierdo, haz clic en **Build (Compilación) > Firestore Database**.
2. Haz clic en **"Crear base de datos"**.
3. Elige la ubicación del servidor (por ejemplo, `us-central1` o `nam5`).
4. Selecciona **Modo de prueba** (o modo producción).

### 3. Reglas de Seguridad (Security Rules)
En la pestaña **Reglas (Rules)** de Firestore, pega las siguientes reglas y haz clic en **Publicar**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Sesiones creadas por docentes
    match /sessions/{sessionId} {
      allow read: if true;
      allow create: if request.resource.data.active == true;
      allow update, delete: if true;
      
      // Puntuaciones de los estudiantes en esa sesión
      match /scores/{scoreId} {
        allow read: if true;
        allow create: if request.resource.data.puntos >= 0;
        allow update, delete: if true;
      }
    }
  }
}
```

### 4. Obtener las credenciales Web
1. En la página principal de tu proyecto de Firebase, haz clic en el ícono de **Web** (`</>`) para registrar una app.
2. Nómbrala `Ciudad PC Web` y pulsa **Registrar app**.
3. Copia los valores del objeto `firebaseConfig` y colócalos en un archivo `.env` en la raíz del proyecto (toma como base `.env.example`):

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=ciudad-pc-educativo.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ciudad-pc-educativo
VITE_FIREBASE_STORAGE_BUCKET=ciudad-pc-educativo.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:...
```

---

## 🎓 ¿Cómo funciona en el aula?

### Para el Profesor:
1. En la pantalla inicial del juego, pulsa **"🎓 Docente"**.
2. Ingresa el PIN (por defecto `1234` o el que definas).
3. Escribe un código para la clase (ej. `GRUPO-10A` o haz clic en `🎲 Aleatorio`).
4. Haz clic en **"🚀 Abrir Sesión"**.
5. Comparte el código con los estudiantes, o haz clic en **"📋 Copiar Enlace"** para enviarles un link que auto-rellena el código (`?session=GRUPO-10A`).
6. Pulsa **"🖥️ Pantalla de Proyector en Vivo"** para proyectar en el salón el podio con el ganador del chocolate en tiempo real.

### Para el Estudiante:
1. Abre el enlace del juego en su computadora o celular.
2. Ingresa su nombre y el código de la sesión que dio el profesor.
3. Conduce por Ciudad PC y descubre los 9 componentes.
4. Va al Coliseo y completa el quiz tipo Kahoot.
5. Su puntaje se guarda automáticamente en la sesión de la clase y el marcador se actualiza en el proyector.
