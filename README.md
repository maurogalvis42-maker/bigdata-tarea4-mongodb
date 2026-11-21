# Tarea 4 – Almacenamiento y Consultas de Datos en Big Data (MongoDB)

**Curso:** Big Data (202016911) – UNAD · **Grupo:** 66
**Autor:** Andres Mauricio Galvis Gutierrez

## Caso de uso

Base de datos de **SonoraStream**, una plataforma ficticia de streaming musical, que continúa el análisis de datos de Spotify de la Tarea 3. Tiene tres colecciones:

| Colección | Documentos | Contenido |
|---|---|---|
| `usuarios` | 50 | Perfil del oyente, plan y preferencias (subdocumento embebido) |
| `canciones` | 120 | Catálogo con artista y características de audio embebidos |
| `reproducciones` | 600 | Log de eventos de escucha con referencias a usuario y canción |

**Total:** 770 documentos de prueba, generados con una semilla fija para que los resultados sean reproducibles.

## Estructura

```
scripts/
  01_crear_bd.js        Base de datos, colecciones con validación $jsonSchema e índices
  02_insertar_datos.js  Generación e inserción de los 770 documentos (insertMany)
  03_crud.js            Inserción, selección, actualización (updateOne/updateMany/upsert) y eliminación
  04_filtros_join.js    Operadores ($and, $or, $in, $regex, $exists, $all, $size, $text), joins con $lookup y explain()
  05_agregaciones.js    Estadísticas: $group, $sum, $avg, $min, $max, $bucket, $facet, $dateToString, $out
capturas/               Resultado real de cada consulta (Q01–Q29) y diagrama del esquema
```

Cada consulta está marcada en el código como `// @@ Qnn | título`.

## Cómo ejecutar

Requisitos: Docker (o MongoDB 7 instalado localmente con `mongosh`).

```bash
# 1. Levantar MongoDB 7
docker run -d --name mongo-fase4 -p 27017:27017 mongo:7

# 2. Copiar los scripts al contenedor
docker cp scripts mongo-fase4:/scripts

# 3. Ejecutarlos en orden
docker exec -it mongo-fase4 mongosh streaming_musical /scripts/01_crear_bd.js
docker exec -it mongo-fase4 mongosh streaming_musical /scripts/02_insertar_datos.js
docker exec -it mongo-fase4 mongosh streaming_musical /scripts/03_crud.js
docker exec -it mongo-fase4 mongosh streaming_musical /scripts/04_filtros_join.js
docker exec -it mongo-fase4 mongosh streaming_musical /scripts/05_agregaciones.js

# 4. (Opcional) Consola interactiva
docker exec -it mongo-fase4 mongosh streaming_musical
```

Con MongoDB local: `mongosh streaming_musical scripts/01_crear_bd.js` (y así con los demás).

> El script 01 borra y vuelve a crear la base `streaming_musical`, así que todo el proceso se puede repetir desde cero.

## Algunos resultados

- `explain()` muestra que la consulta del historial de un usuario usa el índice `ix_usuario_fecha` (IXSCAN, 8 documentos examinados) frente a un COLLSCAN de 589 documentos sin índice.
- El móvil concentra el 50 % de las reproducciones y tiene la mayor tasa de finalización (72,2 %).
- Rock tiene la popularidad promedio más alta (61,1) y reggaeton la más baja (40,4).
- Género más escuchado por país: hip-hop en Chile, electrónica en Perú, pop en Colombia y Argentina.
