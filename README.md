# Calima

<div align="center">
  <img src="logo.png" alt="Calima" width="140" />
</div>

**Calima** es una aplicación web de almacenamiento en la nube personal. Sube, organiza y comparte tus archivos desde cualquier dispositivo, con un diseño oscuro minimalista inspirado en Material You.

---

## Características

- **Autenticación con Google** (Supabase Auth + OAuth 2.0).
- **Gestión de archivos**: sube, abre y elimina archivos con un solo clic.
- **Carpetas**: crea y navega por carpetas anidadas con breadcrumb interactivo.
- **Drag & drop global**: arrastra archivos a cualquier parte de la pantalla para subirlos.
- **Subida múltiple** con barra de progreso en tiempo real y estado por archivo.
- **Enlaces firmados** para abrir archivos de forma segura (URLs temporales de 1 hora).
- **Diseño responsive** con layout adaptativo para móvil y escritorio.
- **Tema oscuro Material You** con acentos morados, transiciones suaves y microanimaciones.
- **Snackbars** de feedback para cada acción (subida, borrado, errores).
- **Scrollbar oculta** y estética limpia sin distracciones.

---

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | HTML5 + CSS3 + JavaScript (vanilla) |
| Backend / Storage | [Supabase](https://supabase.com/) (Storage + Auth) |
| Autenticación | Google OAuth 2.0 (vía Supabase Auth) |
| Tipografía | Google Fonts (Varela Round) |
| Iconografía | Material Icons |

Sin frameworks, sin bundler, sin build step. Se abre directamente en el navegador.

---

## Estructura del proyecto

```
calima/
├── index.html      # Estructura (login + dashboard + overlays)
├── scripts.js      # Lógica de la app (auth, storage, uploads, UI)
├── styles.css      # Estilos (Material You dark)
├── logo.png        # Logo / favicon
└── README.md
```

---

## Puesta en marcha

1. **Clona el repositorio**
   ```bash
   git clone https://github.com/tu-usuario/calima.git
   cd calima
   ```

2. **Sirve la carpeta** con cualquier servidor estático, por ejemplo:
   ```bash
   npx serve .
   # o
   python -m http.server 8000
   ```

3. Abre `http://localhost:8000` en el navegador. Listo

---

## Configuración de Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com/).

2. **Crea un bucket** en Storage llamado `calima` (o el nombre que prefieras):
   - Puede ser **privado** (recomendado, ya que se usan *signed URLs*).
   - Sin límite de tamaño estricto, pero se recomienda configurar uno razonable (ej. 100 MB por archivo).

3. **Habilita Google como proveedor de Auth**:
   - Ve a *Authentication → Providers → Google*.
   - Activa el proveedor y pega tu **Client ID** y **Client Secret** de Google Cloud Console.
   - Agrega `https://tu-proyecto.supabase.co/auth/v1/callback` como *Authorized redirect URI* en Google Cloud.

4. **Configura las credenciales** en `scripts.js`:
   ```js
   const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
   const SUPABASE_ANON_KEY = 'tu-anon-key';
   const STORAGE_BUCKET = 'calima';
   ```

5. **Políticas de Storage** (RLS) — para que cada usuario solo vea sus propios archivos, agrega políticas como:
   ```sql
   -- Permitir al dueño leer/escribir en su carpeta
   create policy "Users can access their own folder"
   on storage.objects for all
   using (bucket_id = 'calima' AND auth.uid()::text = (storage.foldername(name))[1])
   with check (bucket_id = 'calima' AND auth.uid()::text = (storage.foldername(name))[1]);
   ```

---

## Cómo funciona

### Autenticación

El flujo es 100% delegado a Supabase Auth:

1. El usuario pulsa **"Sign in with Google"**.
2. `signInWithOAuth({ provider: 'google' })` redirige a Google.
3. Google devuelve el `code` a la URL y el SDK lo intercambia por una sesión (PKCE).
4. La sesión se guarda en `localStorage` con la key `calima-auth` y se restaura automáticamente.

### Carpetas

Supabase Storage no tiene concepto nativo de carpetas — se simulan con **paths**. Una carpeta es en realidad un objeto vacío llamado `.keep`:

```
mi-carpeta/.keep        ← marca la carpeta como existente
mi-carpeta/foto.jpg     ← archivo dentro de la carpeta
```

Al listar un path, los objetos cuyo `id === null` o `size === 0` se muestran como carpetas. El `.keep` nunca se renderiza.

### Subida de archivos

- **Botón Upload**: abre el explorador de archivos nativo (`<input type="file" multiple>`).
- **Drag & drop**: al arrastrar archivos sobre la ventana, se muestra un overlay; al soltar, se suben a la carpeta actual.
- Se usa `upsert: true` para sobrescribir archivos con el mismo nombre.
- Barra de progreso muestra el avance archivo por archivo con iconos de estado (⏳ → ✅ / ❌).

### Apertura de archivos

Los archivos se sirven mediante **signed URLs** temporales (1 hora) generadas al vuelo con `createSignedUrl()`. Esto permite tener el bucket privado sin exponer los archivos públicamente.

---

## Paleta de colores

| Variable | Valor |
|----------|-------|
| `--bg` | `#0A0A0E` |
| `--surface-1` | `#16161C` |
| `--surface-2` | `#1E1E26` |
| `--accent` | `#C6B8FF` |
| `--text-primary` | `#ECECF2` |
| `--danger` | `#FF8A95` |
| `--success` | `#8FE3A8` |

---

## Limitaciones conocidas

- El bucket `calima` se configura manualmente con nombre fijo en `scripts.js` (no es multi-bucket).
- No hay búsqueda de archivos todavía.
- No hay vista previa de imágenes/documentos (se abren en una pestaña nueva).
- El sistema de carpetas usa `.keep` como marcador — los archivos `.keep` no se muestran pero sí consumen un objeto en el bucket.

---

## Ideas para futuras versiones

- Búsqueda global de archivos.
- Vista previa de imágenes dentro de la app.
- Compartir archivos con enlaces públicos opcionales.
- Mover/renombrar archivos y carpetas.
- Modo claro opcional.
- PWA con soporte offline.

---

## Licencia

Proyecto personal
Hecho con ❤︎ por **Juan Quichimbo**.
