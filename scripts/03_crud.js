// =====================================================================
// Script 03: Consultas básicas CRUD (inserción, selección,
//            actualización y eliminación de documentos).
// Ejecutar:  mongosh streaming_musical scripts/03_crud.js
// =====================================================================

// @@ Q05 | INSERCIÓN: insertOne de un nuevo usuario y una nueva canción
db = db.getSiblingDB("streaming_musical");
const u = db.usuarios.insertOne({
  _id: "U051", nombre: "Mauricio Galvis", email: "mauricio.galvis@correo.com",
  pais: "Colombia", ciudad: "Bogotá", edad: NumberInt(28), plan: "premium",
  fecha_registro: new Date("2026-11-01"), activo: true,
  preferencias: { generos_favoritos: ["rock", "electrónica"], idioma: "es-419" }
});
printjson(u);
const c = db.canciones.insertOne({
  _id: "C121", titulo: "Big Data Blues", artista: { nombre: "Los Clusters", pais: "Colombia" },
  album: "NoSQL", anio: NumberInt(2026), genero: "rock", duracion_seg: NumberInt(215),
  popularidad: NumberInt(50), explicito: false,
  caracteristicas: { danceability: 0.61, energy: 0.83, tempo: 128 }, etiquetas: ["entrenamiento"]
});
printjson(c);

// @@ Q06 | INSERCIÓN inválida: el validador $jsonSchema rechaza el documento
db = db.getSiblingDB("streaming_musical");
try {
  db.usuarios.insertOne({ _id: "U999", nombre: "Sin email", pais: "Chile", edad: NumberInt(10), plan: "gratis",
                          fecha_registro: new Date() });
} catch (e) {
  print("Documento rechazado -> " + e.errmsg);
  // Detalle de las reglas del esquema que no se cumplieron
  e.errInfo.details.schemaRulesNotSatisfied.forEach(r => {
    const props = (r.propertiesNotSatisfied || []).map(x => x.propertyName);
    const falt = (r.missingProperties || []);
    print("  regla " + r.operatorName + ": " + props.concat(falt).join(", "));
  });
}

// @@ Q07 | SELECCIÓN: find con proyección, ordenamiento y límite
db = db.getSiblingDB("streaming_musical");
// Las 5 canciones más populares (solo título, artista y popularidad)
db.canciones.find({}, { _id: 0, titulo: 1, "artista.nombre": 1, popularidad: 1 })
            .sort({ popularidad: -1 }).limit(5)
            .forEach(d => printjson(d));

// @@ Q08 | SELECCIÓN: findOne por _id y búsqueda en subdocumento
db = db.getSiblingDB("streaming_musical");
printjson(db.usuarios.findOne({ _id: "U051" }, { nombre: 1, plan: 1, preferencias: 1 }));
print("Usuarios con idioma es-ES: " + db.usuarios.countDocuments({ "preferencias.idioma": "es-ES" }));

// @@ Q09 | ACTUALIZACIÓN: updateOne con $set y $push
db = db.getSiblingDB("streaming_musical");
const r = db.usuarios.updateOne(
  { _id: "U051" },
  { $set: { plan: "familiar", ciudad: "Medellín" }, $push: { "preferencias.generos_favoritos": "jazz" } }
);
printjson({ coincidencias: r.matchedCount, modificados: r.modifiedCount });
printjson(db.usuarios.findOne({ _id: "U051" }, { _id: 0, plan: 1, ciudad: 1, preferencias: 1 }));

// @@ Q10 | ACTUALIZACIÓN: updateMany con $inc y $addToSet
db = db.getSiblingDB("streaming_musical");
// Campaña: sube 5 puntos de popularidad a todas las canciones de salsa y les agrega la etiqueta "campaña"
const antes = db.canciones.aggregate([{ $match: { genero: "salsa" } }, { $group: { _id: null, prom: { $avg: "$popularidad" } } }]).next().prom;
const rm = db.canciones.updateMany({ genero: "salsa" }, { $inc: { popularidad: 5 }, $addToSet: { etiquetas: "campaña" } });
const despues = db.canciones.aggregate([{ $match: { genero: "salsa" } }, { $group: { _id: null, prom: { $avg: "$popularidad" } } }]).next().prom;
printjson({ modificados: rm.modifiedCount, popularidad_prom_antes: antes.toFixed(2), popularidad_prom_despues: despues.toFixed(2) });

// @@ Q11 | ACTUALIZACIÓN con upsert (inserta si no existe)
db = db.getSiblingDB("streaming_musical");
const up = db.usuarios.updateOne(
  { _id: "U052" },
  { $set: { nombre: "Usuario Demo", email: "demo@correo.com", pais: "Perú", ciudad: "Lima", edad: NumberInt(33),
            plan: "free", fecha_registro: new Date("2026-11-15"), activo: true } },
  { upsert: true }
);
printjson(up);
printjson(db.usuarios.findOne({ _id: "U052" }, { nombre: 1, pais: 1, plan: 1 }));

// @@ Q12 | ELIMINACIÓN: deleteOne y deleteMany
db = db.getSiblingDB("streaming_musical");
const d1 = db.usuarios.deleteOne({ _id: "U052" });
print("deleteOne usuario U052 -> eliminados: " + d1.deletedCount);
// Limpieza de ruido: reproducciones de menos de 20 segundos (saltos accidentales)
print("Reproducciones < 20 s antes:  " + db.reproducciones.countDocuments({ segundos_escuchados: { $lt: 20 } }));
const d2 = db.reproducciones.deleteMany({ segundos_escuchados: { $lt: 20 } });
print("deleteMany -> eliminadas: " + d2.deletedCount);
print("Reproducciones restantes:     " + db.reproducciones.countDocuments());
