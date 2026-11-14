# Verificación de BioCaquetá 2

Comprobaciones completadas:

- 20 pruebas de integración aprobadas con Supertest y un MongoDB temporal real. Cubren el CRUD original, filtros, validaciones, coordenadas, fotos, conservación de campos al editar, errores de formulario, historial de solicitudes y caché de búsquedas.
- 11 solicitudes HTTP verificadas con el ejecutor de API incluido: creación, lista, filtro, actualización, persistencia, validaciones, eliminación y 404.
- Pruebas de interfaz con Chromium: portada y tarjetas, pestañas del formulario, selección del punto en el mapa, coordenadas manuales, compresión y guardado de foto, mapa de detalle, vista general, panel de solicitudes, edición, quitar foto, búsqueda y confirmación de eliminación.
- Vista de 390 px verificada sin desbordamiento horizontal y con apertura/cierre del panel lateral.
- Sin errores JavaScript durante los recorridos de interfaz.
- Dependencias auditadas: cero vulnerabilidades reportadas al completar esta versión.
- ZIP comprobado mediante CRC y exclusión de node_modules, binarios temporales y credenciales reales.

Alcance de estas comprobaciones:

La persistencia se comprobó en MongoDB temporal, no en una cuenta de Atlas. Para producción debes configurar tu cadena en .env. El modo demo sigue siendo temporal.

La selección de coordenadas y los marcadores fueron verificados. La conexión externa a las teselas de OpenStreetMap está bloqueada en el entorno de pruebas (ERR_NETWORK_ACCESS_DENIED), por lo que aquí se verificó también el mensaje de recuperación y la entrada manual. El fondo del mapa y Nominatim necesitan Internet en el computador donde ejecutes la app; la búsqueda geográfica se probó con una respuesta simulada para validar su manejo y caché.

La colección de Postman se conserva para ejecutarla en la aplicación Postman. Las 11 pruebas HTTP del comando test:api son equivalentes, pero no se presentan como una ejecución de la colección en Postman.
