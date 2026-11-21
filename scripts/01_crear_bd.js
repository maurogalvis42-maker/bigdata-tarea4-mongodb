// =====================================================================
// Tarea 4 - Almacenamiento y Consultas de Datos en Big Data (UNAD)
// Caso de uso: Plataforma de streaming musical "SonoraStream"
// Script 01: Creación de la base de datos, colecciones con validación
//            ($jsonSchema) e índices.
// Ejecutar:  mongosh streaming_musical scripts/01_crear_bd.js
// =====================================================================

// @@ Q01 | Crear la base de datos y las colecciones con validación de esquema
// Se reinicia la base para que el script sea repetible.
db = db.getSiblingDB("streaming_musical");
db.dropDatabase();

// Colección usuarios: perfil del oyente con un subdocumento de preferencias.
db.createCollection("usuarios", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "nombre", "email", "pais", "edad", "plan", "fecha_registro"],
      properties: {
        _id:    { bsonType: "string", pattern: "^U[0-9]{3}$" },
        nombre: { bsonType: "string" },
        email:  { bsonType: "string", pattern: "^.+@.+\\..+$" },
        pais:   { bsonType: "string" },
        ciudad: { bsonType: "string" },
        edad:   { bsonType: "int", minimum: 13, maximum: 100 },
        plan:   { enum: ["free", "premium", "familiar", "estudiante"] },
        fecha_registro: { bsonType: "date" },
        activo: { bsonType: "bool" },
        preferencias: {
          bsonType: "object",
          properties: {
            generos_favoritos: { bsonType: "array", items: { bsonType: "string" } },
            idioma: { bsonType: "string" }
          }
        }
      }
    }
  },
  validationAction: "error"
});

// Colección canciones: catálogo; el artista va embebido porque siempre
// se consulta junto con la canción (patrón "embedding").
db.createCollection("canciones", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "titulo", "artista", "genero", "duracion_seg", "popularidad"],
      properties: {
        _id:    { bsonType: "string", pattern: "^C[0-9]{3}$" },
        titulo: { bsonType: "string" },
        artista: {
          bsonType: "object",
          required: ["nombre", "pais"],
          properties: { nombre: { bsonType: "string" }, pais: { bsonType: "string" } }
        },
        album:        { bsonType: "string" },
        anio:         { bsonType: "int", minimum: 1950, maximum: 2026 },
        genero:       { bsonType: "string" },
        duracion_seg: { bsonType: "int", minimum: 30 },
        popularidad:  { bsonType: "int", minimum: 0, maximum: 100 },
        explicito:    { bsonType: "bool" },
        caracteristicas: { bsonType: "object" },
        etiquetas:    { bsonType: "array" }
      }
    }
  }
});

// Colección reproducciones: log de eventos (crece muy rápido = Big Data).
// Se usan referencias (usuario_id, cancion_id) en lugar de embebido.
db.createCollection("reproducciones", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["usuario_id", "cancion_id", "fecha", "segundos_escuchados", "dispositivo"],
      properties: {
        usuario_id: { bsonType: "string" },
        cancion_id: { bsonType: "string" },
        fecha:      { bsonType: "date" },
        segundos_escuchados: { bsonType: "int", minimum: 0 },
        completada: { bsonType: "bool" },
        dispositivo: { enum: ["movil", "web", "escritorio", "smart_tv"] },
        calificacion: { bsonType: "int", minimum: 1, maximum: 5 }
      }
    }
  }
});

print("Base de datos actual: " + db.getName());
printjson(db.getCollectionNames());

// @@ Q02 | Crear índices para optimizar las consultas más frecuentes
db = db.getSiblingDB("streaming_musical");
db.usuarios.createIndex({ email: 1 }, { unique: true, name: "ux_email" });
db.usuarios.createIndex({ pais: 1, plan: 1 }, { name: "ix_pais_plan" });
db.canciones.createIndex({ genero: 1, popularidad: -1 }, { name: "ix_genero_popularidad" });
db.canciones.createIndex({ titulo: "text", "artista.nombre": "text" }, { name: "tx_titulo_artista" });
db.reproducciones.createIndex({ usuario_id: 1, fecha: -1 }, { name: "ix_usuario_fecha" });
db.reproducciones.createIndex({ cancion_id: 1 }, { name: "ix_cancion" });

["usuarios", "canciones", "reproducciones"].forEach(c => {
  print("Índices de " + c + ": " + db[c].getIndexes().map(i => i.name).join(", "));
});
