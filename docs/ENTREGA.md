# Guía para la entrega del taller

## Lo que debes entregar

El enunciado solicita enviar la **URL del repositorio público en GitHub** al correo `w.patino@udla.edu.co` a más tardar el **viernes 13 de noviembre de 2026 a las 6:00 p. m.**, hora de Colombia. En la próxima clase se presenta Postman ejecutando GET y POST y MongoDB Atlas mostrando los documentos persistidos.

El proyecto incluye código y colección. Para completar la entrega externa debes configurar tu conexión de Atlas, comprobar un documento en el panel y publicar el repositorio en tu cuenta. El archivo `.env` contiene la configuración local y no debe publicarse.

## Correspondencia con los requisitos

| Requisito | Implementación | Evidencia que puedes mostrar |
| --- | --- | --- |
| RF-01: Atlas | `src/config/db.js` llama `mongoose.connect()` con `biocaqueta_db` | Documento en Browse Collections → biocaqueta_db → avistamientos |
| Modelo y validaciones | `src/models/Avistamiento.js` define los siete campos, enums y defaults | POST válido y POST inválido en Postman |
| RF-02: API | `src/routes/api.router.js` usa `express.Router()` y `try/catch` | Colección de Postman importada |
| Orden descendente y filtro | GET usa `.sort({fechaRegistro:-1,_id:-1})` y query `categoria` | Petición de filtro por Ave |
| JSON y formularios | POST admite JSON y urlencoded; redirige los formularios | Crear un registro desde la web y otro desde Postman |
| PUT y DELETE | Actualización con validadores y `findByIdAndDelete()` | Cambiar zona/estado y eliminar el registro de prueba |
| Alias HTML | POST `/update/:id` y `/delete/:id` | Botones Editar y Eliminar en la interfaz |
| RF-03: vistas | `src/routes/views.router.js`, consultas `.lean()` | Inicio y edición con campos precargados |

## Guion de presentación (aproximadamente cinco minutos)

1. Abre la web y explica el contexto de registrar especies del Piedemonte Amazónico.
2. Registra un avistamiento con el formulario y verifica que aparezca en las tarjetas.
3. Abre Atlas en **Browse Collections**, selecciona `biocaqueta_db.avistamientos`, actualiza y muestra el mismo registro.
4. Abre Postman. Ejecuta **01 · Crear avistamiento** y señala el estado **201**, el `_id` y los campos por defecto.
5. Ejecuta **02 · Listar avistamientos** y **03 · Filtrar por categoría**. Explica el orden por fecha descendente.
6. Ejecuta **04 · Actualizar zona y estado** y comprueba el cambio en la web o en Atlas.
7. Edita un registro desde la interfaz y explica que usa el alias POST porque los formularios HTML no envían PUT directamente.
8. Explica el esquema Mongoose, `.lean()`, la división de routers y los códigos 400/404.

Usa observaciones de ejemplo y aclara que no son datos científicos verificados. La ejecución completa de la colección elimina únicamente su registro de prueba; crea uno nuevo si necesitas dejarlo visible en Atlas.

## Problemas frecuentes

- **Falta MONGODB_URI**: abre `.env` y pega la cadena real del clúster; no dejes los marcadores de ejemplo.
- **No conecta a Atlas**: confirma el usuario de base de datos, la contraseña codificada, el clúster activo y `0.0.0.0/0` en IP Access List.
- **La base no aparece**: crea el primer avistamiento y actualiza Browse Collections.
- **Puerto ocupado**: cambia `PORT=3000` por `PORT=3001` y ajusta `baseUrl` en el entorno de Postman.
- **No descarga MongoDB para pruebas/demo**: necesitas conexión a Internet. Esto afecta al entorno temporal de pruebas; la aplicación normal usa Atlas y no descarga ese binario.
- **GitHub pide autenticar**: inicia sesión con tu cuenta o el flujo de Git Credential Manager. No pongas un token en el código ni en el README.
