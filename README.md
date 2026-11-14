# BioCaquetá Grupo 11

Sistema de monitoreo de biodiversidad y avistamientos del Piedemonte Amazónico.
Taller Práctico de Backend · Ingeniería de Sistemas · Universidad de la Amazonia.

**Tecnologías:** Node.js, Express, express.Router, Mongoose, MongoDB Atlas, Express-Handlebars y Postman.

## Cómo ejecutarlo

1. Instala las dependencias:
   ```
   npm install
   ```
2. Copia `.env.example` como `.env` y pega tu cadena de MongoDB Atlas:
   ```
   MONGODB_URI=mongodb+srv://USUARIO:CONTRASEÑA@TU_CLUSTER.mongodb.net/biocaqueta_db
   PORT=3000
   ```
3. Inicia el servidor:
   ```
   npm start
   ```
4. Abre **http://localhost:3000**

Opcional: `npm run seed` inserta 3 registros de ejemplo si la colección está vacía.

## API REST · `/api/avistamientos`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/avistamientos` | Lista todos, del más reciente al más antiguo |
| GET | `/api/avistamientos?categoria=Ave` | Filtra por categoría |
| POST | `/api/avistamientos` | Crea un avistamiento (201) |
| PUT | `/api/avistamientos/:id` | Actualiza un avistamiento |
| DELETE | `/api/avistamientos/:id` | Elimina un avistamiento |
| POST | `/api/avistamientos/update/:id` | Actualiza desde formulario HTML |
| POST | `/api/avistamientos/delete/:id` | Elimina desde formulario HTML |

Ejemplo de body para POST:
```json
{
  "nombreComun": "Danta amazónica",
  "nombreCientifico": "Tapirus terrestris",
  "categoria": "Mamífero",
  "zona": "El Caraño",
  "estadoConservacion": "Vulnerable",
  "investigador": "Jader Sambony"
}
```

**Categorías:** Mamífero, Ave, Reptil, Anfibio, Flora.
**Estados:** Preocupación menor (por defecto), Vulnerable, En peligro.

## Vistas

- `GET /` muestra las fichas de avistamientos y el formulario de registro, que se abre con "Nuevo avistamiento".
- `GET /editar/:id` muestra el formulario precargado para editar.

## Postman

Importa los archivos de la carpeta `postman/`, selecciona el entorno **BioCaquetá · Local** y ejecuta las peticiones con el servidor encendido.

## Autores

Jefferson Hernandez Rojas
Jader Andres Sambony Sarria
Brayan Valencia Cuellar
Grupo 11
