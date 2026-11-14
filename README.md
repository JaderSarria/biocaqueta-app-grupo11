# BioCaquetá

Sistema de monitoreo de biodiversidad y avistamientos del Piedemonte Amazónico. Taller práctico de Backend · Ingeniería de Sistemas · Universidad de la Amazonia.

Aplicación monolítica con **Node.js, Express, express.Router, Mongoose, MongoDB Atlas y Express-Handlebars**. La misma API recibe JSON desde Postman y formularios HTML. Incluye validaciones, filtros, edición precargada, eliminación y mensajes de confirmación.

## Ejecutar en tu computador

Requisito: Node.js 22.23.5 o superior (recomendado: Node.js 24).

1. Abre una terminal dentro de `biocaqueta-app`.
2. Ejecuta `npm install`.
3. Abre el archivo `.env` incluido y escribe tu cadena de conexión de MongoDB Atlas en `MONGODB_URI`. Si clonaste desde GitHub, crea primero el archivo con `Copy-Item .env.example .env` en PowerShell o `cp .env.example .env` en Linux/macOS.
4. Ejecuta `npm start`.
5. Abre **http://localhost:3000**.

```env
MONGODB_URI=mongodb+srv://USUARIO:CONTRASENA@TU_CLUSTER.mongodb.net/biocaqueta_db?retryWrites=true&w=majority
PORT=3000
NODE_ENV=development
```

La cadena anterior es un **ejemplo**, no una conexión funcional. Usa el hostname exacto de tu clúster y un usuario de base de datos. Si el usuario o la contraseña tienen caracteres como `@`, `#`, `/` o `:`, codifícalos con `encodeURIComponent`. No subas `.env` al repositorio.

Para reiniciar automáticamente al editar archivos: `npm run dev`.

## Configurar MongoDB Atlas (RF-01)

1. En [MongoDB Atlas](https://cloud.mongodb.com/), abre tu proyecto y crea o selecciona un clúster. Para este taller basta un clúster gratuito disponible en tu cuenta.
2. En **Database & Network Access → Database Users**, crea un usuario de base de datos con permiso de lectura y escritura sobre `biocaqueta_db`. Ese usuario es distinto al de inicio de sesión de Atlas.
3. En **IP Access List**, agrega **0.0.0.0/0** para permitir conexión desde cualquier IP, como exige el enunciado. Conserva una contraseña fuerte para el usuario de base de datos; al terminar la práctica puedes restringir la lista.
4. En el clúster, selecciona **Connect → Drivers → Node.js** y copia la cadena a `.env`.
5. Ejecuta `npm start` y registra un avistamiento desde el formulario.
6. En Atlas abre **Browse Collections → biocaqueta_db → avistamientos** y actualiza la vista. Debe aparecer el documento creado. La base y la colección se crean con la primera inserción.

La aplicación establece `dbName: 'biocaqueta_db'` al llamar a `mongoose.connect()` y el modelo fija la colección `avistamientos`.

### Datos de ejemplo opcionales

Después de conectar Atlas, ejecuta `npm run seed` si deseas tres registros de demostración. El script solo inserta cuando la colección está vacía; nunca elimina datos. Los ejemplos son ficticios para la práctica y no representan observaciones científicas verificadas.

Para revisar la interfaz sin configurar Atlas puedes ejecutar `npm run demo`. Este modo usa un servidor MongoDB local temporal, descarga su binario en la primera ejecución y pierde sus datos al cerrar. **La demo no cumple la persistencia en Atlas exigida por RF-01.**

## API REST (RF-02)

Base: `http://localhost:3000/api/avistamientos`.

| Método | Ruta | Resultado |
| --- | --- | --- |
| GET | `/api/avistamientos` | Lista JSON ordenada por fecha descendente, 200 |
| GET | `/api/avistamientos?categoria=Ave` | Lista filtrada por categoría, 200 |
| POST | `/api/avistamientos` | Crea un avistamiento y devuelve el objeto, 201 |
| PUT | `/api/avistamientos/:id` | Actualiza los campos enviados, 200 |
| DELETE | `/api/avistamientos/:id` | Elimina y devuelve confirmación, 200 |
| POST | `/api/avistamientos/update/:id` | Actualización desde formulario HTML |
| POST | `/api/avistamientos/delete/:id` | Eliminación desde formulario HTML |

Los formularios exitosos redirigen con **303** al inicio. Los errores devuelven **400** para datos o identificadores inválidos, **404** para recursos inexistentes, **413** para cuerpos demasiado grandes, **415** para tipos de contenido no admitidos y **500** para errores internos. Los controladores usan `try/catch` y el manejador central devuelve JSON a la API o una vista de error a los formularios.

Ejemplo de POST (Body → raw → JSON en Postman):

```json
{
  "nombreComun": "Danta amazónica",
  "nombreCientifico": "Tapirus terrestris",
  "categoria": "Mamífero",
  "zona": "El Caraño",
  "estadoConservacion": "Vulnerable",
  "investigador": "Nombre del investigador"
}
```

`estadoConservacion` es opcional y vale `Preocupación menor` por defecto. `fechaRegistro` es opcional y usa la fecha actual; la API también acepta una fecha ISO válida. Categorías permitidas: `Mamífero`, `Ave`, `Reptil`, `Anfibio`, `Flora`. Estados: `Preocupación menor`, `Vulnerable`, `En peligro`.

## Vistas Handlebars (RF-03)

- `GET /`: formulario arriba, resumen y tarjetas abajo; consulta con `.lean()` y permite filtrar por categoría.
- `GET /editar/:id`: formulario precargado consultado con `.lean()`; conserva la fecha original.
- Los botones envían los formularios a los alias POST pedidos por el taller.
- Interfaz adaptable a móvil, nombres científicos en cursiva y confirmación de eliminación.

## Probar con Postman

1. Importa `postman/BioCaqueta.postman_collection.json`.
2. Importa `postman/Local.postman_environment.json` y selecciona el entorno **BioCaquetá · Local**.
3. Inicia la aplicación conectada a Atlas con `npm start`.
4. Ejecuta la colección completa en orden con **Run collection**. Crea un registro de prueba, guarda su `_id`, prueba GET, filtro, PUT y DELETE y verifica errores. Solo elimina el registro que ella misma creó.
5. Para conservar un documento visible en Atlas durante la presentación, ejecuta otra vez únicamente la petición **01 · Crear avistamiento** y luego **02 · Listar avistamientos**.

También puedes ejecutar pruebas equivalentes de la API desde terminal con `npm run test:api` mientras el servidor está encendido. El comando usa Node.js y no necesita instalar Newman; la colección se ejecuta en Postman con Run collection.

## Pruebas automáticas

```powershell
npm test
```

La suite utiliza Supertest y un MongoDB real temporal con `mongodb-memory-server`, separado de Atlas. Prueba persistencia, defaults, orden, filtros, validaciones, códigos HTTP, CRUD, formularios y escape HTML. La primera ejecución necesita Internet para descargar el binario de MongoDB. No toca tu base de Atlas.

## Publicar el repositorio en GitHub

Desde la carpeta del proyecto:

```powershell
git init
git add .
git commit -m "Implementa BioCaqueta: API REST, Atlas y Handlebars"
git branch -M main
```

En GitHub crea un repositorio **público** vacío llamado `biocaqueta-app` y ejecuta los comandos que GitHub muestra, sustituyendo `TU_USUARIO`:

```powershell
git remote add origin https://github.com/TU_USUARIO/biocaqueta-app.git
git push -u origin main
```

Antes de publicar, comprueba que `.env` esté ignorado con `git check-ignore .env`. No incluyas contraseñas ni credenciales en capturas, README o Postman.

## Estructura

- `src/config/db.js`: conexión Mongoose a Atlas.
- `src/models/Avistamiento.js`: esquema, validaciones y colección.
- `src/routes/api.router.js`: API JSON y alias POST para formularios.
- `src/routes/views.router.js`: renderización Handlebars.
- `src/views/`: layout, inicio, edición, errores y parciales.
- `src/public/`: CSS, JavaScript e icono local.
- `src/middleware/errores.js`: manejo de errores HTML/JSON.
- `src/app.js`: configuración de Express y arranque después de conectar la base.
- `postman/`: colección y entorno sin credenciales.
- `test/`: pruebas de integración.
- `docs/ENTREGA.md`: guía de presentación y correspondencia con el taller.

## Documentación consultada

- [Enrutamiento en Express](https://expressjs.com/en/guide/routing.html)
- [Validación en Mongoose](https://mongoosejs.com/docs/validation.html)
- [Consultas lean](https://mongoosejs.com/docs/tutorials/lean.html)
- [Conexión a Atlas](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/)
- [Lista de acceso IP de Atlas](https://www.mongodb.com/docs/atlas/security/ip-access-list/)


## Novedades de la versión 2

- Diseño con portada amazónica, tarjetas por categoría, iconos, animaciones al entrar en pantalla, transiciones y adaptación al celular; respeta la preferencia de reducir movimiento.
- Formulario en tres secciones: la especie, el lugar y la fotografía. Los datos se envían juntos al guardar.
- Mapa interactivo con Leaflet y OpenStreetMap. Puedes buscar un lugar, hacer clic, arrastrar el marcador, usar tu ubicación o introducir coordenadas. Google Maps se abre como enlace al punto seleccionado. El mapa integrado no requiere una clave de Google.
- Vista general en mapa de los avistamientos con coordenadas y mapa de detalle por registro. Los registros antiguos siguen funcionando; añade coordenadas desde Editar.
- Fotografía opcional con selección de archivo, arrastrar y soltar, vista previa y opción de reemplazar o quitar. La imagen se comprime en el navegador a JPG antes de enviarla, con tamaño final máximo de 1,5 MB. Origen permitido: JPG, PNG o WebP de hasta 10 MB.
- La foto se almacena con el documento en MongoDB (también en Atlas). No depende de una carpeta local de archivos subidos. GET de listado devuelve fotoUrl y tieneFoto; los bytes se consultan por separado en GET /api/avistamientos/:id/foto.
- Botón lateral Solicitudes: abre el panel oculto de actividad HTTP. Incluye peticiones de la interfaz y de Postman, filtros, código HTTP, duración y detalles. Conserva las últimas 50 operaciones en memoria durante la sesión del servidor; omite la foto y credenciales del historial. Solo consulta el historial mientras el panel está abierto.
- Búsqueda inmediata por nombre, especie, investigador o zona dentro de los registros cargados. El filtro de categoría sigue consultando MongoDB.

### Campos opcionales de API

`latitud` y `longitud` se envían juntas, como números JSON o texto de formulario; sus rangos son -90 a 90 y -180 a 180. Ambas vacías o null quitan el punto. Un PUT sin estos campos conserva las coordenadas actuales.

`foto` acepta una data URL base64 JPG, PNG o WebP válida de máximo 1,5 MB. Se valida el formato y la firma del archivo; no se permiten SVG. La interfaz prepara este dato automáticamente. Un PUT que omite la foto la conserva; `removerFoto: true` la elimina. Los listados no incluyen el contenido base64.

Rutas adicionales: GET `/api/solicitudes` devuelve el historial de actividad y GET `/api/lugares?q=...` busca un lugar. La búsqueda geográfica usa Nominatim, se realiza solo al pulsar Buscar, conserva resultados en caché y limita las consultas a una cada 1,1 segundos para toda esta instancia del servidor. Puede cambiarse el proveedor con `GEOCODER_URL` en .env.

### Conectividad y datos de demostración

La aplicación se abre igual: `npm install` y `npm run demo` para la demostración temporal; `npm start` con .env configurado para Atlas. Los mapas de fondo y la búsqueda de lugares necesitan Internet. Si no hay conexión, puedes guardar el nombre de la zona y escribir las coordenadas. El GPS necesita que concedas permiso al navegador y puede tener precisión limitada.

La portada es una imagen ilustrativa generada para el diseño, no un avistamiento registrado. Las tarjetas sin foto muestran ilustraciones de su categoría. Los registros y puntos del modo demo son ficticios y están identificados como ejemplos.

### Actualizar desde la primera versión

1. Detén el servidor anterior con Ctrl+C.
2. Descomprime esta versión en una carpeta nueva. Si ya usas Atlas, copia únicamente tu archivo .env a la carpeta nueva.
3. Ejecuta npm install dentro de biocaqueta-app.
4. Ejecuta npm run demo o npm start, según el modo que ya usabas, y abre http://localhost:3000.

La versión nueva sigue leyendo los avistamientos anteriores de Atlas. No es necesario borrar ni migrar la colección.
