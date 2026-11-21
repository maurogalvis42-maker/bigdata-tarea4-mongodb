// =====================================================================
// Script 04: Consultas con filtros y operadores, y uniones (join)
//            entre colecciones con $lookup.
// Ejecutar:  mongosh streaming_musical scripts/04_filtros_join.js
// =====================================================================

// @@ Q13 | FILTROS: operadores de comparación y lógicos ($gte, $lte, $in, $and, $or)
db = db.getSiblingDB("streaming_musical");
// Usuarios entre 18 y 30 años, de Colombia o México, con plan premium o estudiante
db.usuarios.find({
  $and: [
    { edad: { $gte: 18, $lte: 30 } },
    { pais: { $in: ["Colombia", "México"] } },
    { $or: [{ plan: "premium" }, { plan: "estudiante" }] }
  ]
}, { _id: 1, nombre: 1, edad: 1, pais: 1, plan: 1 }).sort({ edad: 1 }).forEach(d => printjson(d));

// @@ Q14 | FILTROS: $regex, $exists, $ne y $nin
db = db.getSiblingDB("streaming_musical");
print("Canciones cuyo título contiene 'Remix':");
db.canciones.find({ titulo: { $regex: /remix/i } }, { _id: 1, titulo: 1 }).limit(5).forEach(d => printjson(d));
print("Reproducciones con calificación ($exists): " + db.reproducciones.countDocuments({ calificacion: { $exists: true } }));
print("Reproducciones sin calificación:           " + db.reproducciones.countDocuments({ calificacion: { $exists: false } }));
print("Canciones que NO son pop ni rock ($nin):   " + db.canciones.countDocuments({ genero: { $nin: ["pop", "rock"] } }));
print("Usuarios con plan distinto de free ($ne):  " + db.usuarios.countDocuments({ plan: { $ne: "free" } }));

// @@ Q15 | FILTROS sobre arrays y subdocumentos ($all, $size, notación punto)
db = db.getSiblingDB("streaming_musical");
print("Canciones con etiquetas 'fiesta' Y 'entrenamiento' ($all):");
db.canciones.find({ etiquetas: { $all: ["fiesta", "entrenamiento"] } }, { _id: 1, titulo: 1, etiquetas: 1 })
            .limit(5).forEach(d => printjson(d));
print("Canciones bailables y enérgicas (danceability > 0.8 y energy > 0.7):");
db.canciones.find({ "caracteristicas.danceability": { $gt: 0.8 }, "caracteristicas.energy": { $gt: 0.7 } },
                  { _id: 1, titulo: 1, genero: 1, caracteristicas: 1 }).forEach(d => printjson(d));
print("Canciones con exactamente 3 etiquetas ($size): " + db.canciones.countDocuments({ etiquetas: { $size: 3 } }));

// @@ Q16 | BÚSQUEDA DE TEXTO con índice text ($text y $meta)
db = db.getSiblingDB("streaming_musical");
db.canciones.find({ $text: { $search: "fuego lluvia" } },
                  { _id: 1, titulo: 1, score: { $meta: "textScore" } })
            .sort({ score: { $meta: "textScore" } }).limit(6).forEach(d => printjson(d));

// @@ Q17 | JOIN con $lookup: historial de un usuario con los datos de la canción
db = db.getSiblingDB("streaming_musical");
db.reproducciones.aggregate([
  { $match: { usuario_id: "U010" } },
  { $sort: { fecha: -1 } },
  { $limit: 5 },
  { $lookup: { from: "canciones", localField: "cancion_id", foreignField: "_id", as: "cancion" } },
  { $unwind: "$cancion" },
  { $project: { _id: 0, fecha: { $dateToString: { format: "%Y-%m-%d %H:%M", date: "$fecha" } },
                titulo: "$cancion.titulo", artista: "$cancion.artista.nombre", genero: "$cancion.genero",
                segundos_escuchados: 1, dispositivo: 1 } }
]).forEach(d => printjson(d));

// @@ Q18 | JOIN de tres colecciones: reproducciones + usuarios + canciones
db = db.getSiblingDB("streaming_musical");
// Reproducciones completadas de reggaeton hechas por usuarios premium de Colombia
db.reproducciones.aggregate([
  { $match: { completada: true } },
  { $lookup: { from: "usuarios", localField: "usuario_id", foreignField: "_id", as: "u" } },
  { $unwind: "$u" },
  { $match: { "u.pais": "Colombia", "u.plan": "premium" } },
  { $lookup: { from: "canciones", localField: "cancion_id", foreignField: "_id", as: "c" } },
  { $unwind: "$c" },
  { $match: { "c.genero": "reggaeton" } },
  { $project: { _id: 0, usuario: "$u.nombre", ciudad: "$u.ciudad", cancion: "$c.titulo", dispositivo: 1 } },
  { $limit: 6 }
]).forEach(d => printjson(d));

// @@ Q19 | JOIN con $lookup + pipeline: usuarios con su número de reproducciones por dispositivo móvil
db = db.getSiblingDB("streaming_musical");
db.usuarios.aggregate([
  { $match: { pais: "Argentina" } },
  { $lookup: {
      from: "reproducciones",
      let: { uid: "$_id" },
      pipeline: [
        { $match: { $expr: { $and: [{ $eq: ["$usuario_id", "$$uid"] }, { $eq: ["$dispositivo", "movil"] }] } } },
        { $count: "total" }
      ],
      as: "movil" } },
  { $project: { _id: 1, nombre: 1, plan: 1, reproducciones_movil: { $ifNull: [{ $first: "$movil.total" }, 0] } } },
  { $sort: { reproducciones_movil: -1 } }
]).forEach(d => printjson(d));

// @@ Q20 | OPTIMIZACIÓN: explain() demuestra que la consulta usa el índice
db = db.getSiblingDB("streaming_musical");
const plan = db.reproducciones.find({ usuario_id: "U010" }).sort({ fecha: -1 }).explain("executionStats");
printjson({
  etapa_ganadora: plan.queryPlanner.winningPlan.inputStage ? plan.queryPlanner.winningPlan.inputStage.stage : plan.queryPlanner.winningPlan.stage,
  indice_usado: plan.queryPlanner.winningPlan.inputStage ? plan.queryPlanner.winningPlan.inputStage.indexName : "ninguno",
  documentos_devueltos: plan.executionStats.nReturned,
  documentos_examinados: plan.executionStats.totalDocsExamined,
  claves_examinadas: plan.executionStats.totalKeysExamined,
  tiempo_ms: plan.executionStats.executionTimeMillis
});
const sinIndice = db.reproducciones.find({ segundos_escuchados: { $gt: 300 } }).explain("executionStats");
printjson({ consulta_sin_indice: sinIndice.queryPlanner.winningPlan.stage,
            documentos_examinados: sinIndice.executionStats.totalDocsExamined,
            documentos_devueltos: sinIndice.executionStats.nReturned });
