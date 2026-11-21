// =====================================================================
// Script 05: Consultas de agregación para calcular estadísticas
//            (contar, sumar, promediar, máximos, mínimos, agrupaciones).
// Ejecutar:  mongosh streaming_musical scripts/05_agregaciones.js
// =====================================================================

// @@ Q21 | CONTAR: countDocuments, distinct y cantidad de canciones por género
db = db.getSiblingDB("streaming_musical");
print("Total usuarios:       " + db.usuarios.countDocuments());
print("Total canciones:      " + db.canciones.countDocuments());
print("Total reproducciones: " + db.reproducciones.countDocuments());
print("Países distintos:     " + db.usuarios.distinct("pais").join(", "));
db.canciones.aggregate([
  { $group: { _id: "$genero", canciones: { $sum: 1 } } },
  { $sort: { canciones: -1 } }
]).forEach(d => printjson(d));

// @@ Q22 | PROMEDIAR: popularidad y duración promedio, máxima y mínima por género
db = db.getSiblingDB("streaming_musical");
db.canciones.aggregate([
  { $group: { _id: "$genero",
              popularidad_promedio: { $avg: "$popularidad" },
              popularidad_max: { $max: "$popularidad" },
              popularidad_min: { $min: "$popularidad" },
              duracion_promedio_min: { $avg: { $divide: ["$duracion_seg", 60] } } } },
  { $project: { popularidad_promedio: { $round: ["$popularidad_promedio", 1] }, popularidad_max: 1, popularidad_min: 1,
                duracion_promedio_min: { $round: ["$duracion_promedio_min", 2] } } },
  { $sort: { popularidad_promedio: -1 } }
]).forEach(d => printjson(d));

// @@ Q23 | SUMAR: top 10 usuarios por minutos totales escuchados
db = db.getSiblingDB("streaming_musical");
db.reproducciones.aggregate([
  { $group: { _id: "$usuario_id", minutos: { $sum: { $divide: ["$segundos_escuchados", 60] } }, reproducciones: { $sum: 1 } } },
  { $sort: { minutos: -1 } },
  { $limit: 10 },
  { $lookup: { from: "usuarios", localField: "_id", foreignField: "_id", as: "u" } },
  { $project: { usuario: { $first: "$u.nombre" }, plan: { $first: "$u.plan" }, reproducciones: 1, minutos: { $round: ["$minutos", 1] } } }
]).forEach(d => printjson(d));

// @@ Q24 | TOP 5 canciones más escuchadas y su calificación promedio
db = db.getSiblingDB("streaming_musical");
db.reproducciones.aggregate([
  { $group: { _id: "$cancion_id", reproducciones: { $sum: 1 }, calificacion_promedio: { $avg: "$calificacion" } } },
  { $sort: { reproducciones: -1, _id: 1 } },
  { $limit: 5 },
  { $lookup: { from: "canciones", localField: "_id", foreignField: "_id", as: "c" } },
  { $project: { titulo: { $first: "$c.titulo" }, genero: { $first: "$c.genero" }, reproducciones: 1,
                calificacion_promedio: { $round: ["$calificacion_promedio", 2] } } }
]).forEach(d => printjson(d));

// @@ Q25 | Tasa de finalización y tiempo promedio de escucha por dispositivo
db = db.getSiblingDB("streaming_musical");
db.reproducciones.aggregate([
  { $group: { _id: "$dispositivo", total: { $sum: 1 },
              completadas: { $sum: { $cond: ["$completada", 1, 0] } },
              segundos_promedio: { $avg: "$segundos_escuchados" } } },
  { $project: { total: 1, completadas: 1,
                tasa_finalizacion_pct: { $round: [{ $multiply: [{ $divide: ["$completadas", "$total"] }, 100] }, 1] },
                segundos_promedio: { $round: ["$segundos_promedio", 0] } } },
  { $sort: { total: -1 } }
]).forEach(d => printjson(d));

// @@ Q26 | Reproducciones por mes en 2026 ($dateToString)
db = db.getSiblingDB("streaming_musical");
db.reproducciones.aggregate([
  { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$fecha" } }, reproducciones: { $sum: 1 },
              horas: { $sum: { $divide: ["$segundos_escuchados", 3600] } } } },
  { $project: { reproducciones: 1, horas: { $round: ["$horas", 2] } } },
  { $sort: { _id: 1 } }
]).forEach(d => printjson(d));

// @@ Q27 | Género más escuchado por país (join + $group + $first)
db = db.getSiblingDB("streaming_musical");
db.reproducciones.aggregate([
  { $lookup: { from: "usuarios", localField: "usuario_id", foreignField: "_id", as: "u" } },
  { $lookup: { from: "canciones", localField: "cancion_id", foreignField: "_id", as: "c" } },
  { $group: { _id: { pais: { $first: "$u.pais" }, genero: { $first: "$c.genero" } }, total: { $sum: 1 } } },
  { $sort: { "_id.pais": 1, total: -1 } },
  { $group: { _id: "$_id.pais", genero_top: { $first: "$_id.genero" }, reproducciones: { $first: "$total" } } },
  { $sort: { reproducciones: -1 } }
]).forEach(d => printjson(d));

// @@ Q28 | $bucket: distribución de usuarios por rango de edad y $facet por plan
db = db.getSiblingDB("streaming_musical");
db.usuarios.aggregate([
  { $facet: {
      por_edad: [
        { $bucket: { groupBy: "$edad", boundaries: [13, 18, 26, 36, 51, 101], default: "otro",
                     output: { usuarios: { $sum: 1 }, edad_promedio: { $avg: "$edad" } } } },
        { $project: { usuarios: 1, edad_promedio: { $round: ["$edad_promedio", 1] } } }
      ],
      por_plan: [ { $group: { _id: "$plan", usuarios: { $sum: 1 } } }, { $sort: { usuarios: -1 } } ]
  } }
]).forEach(d => printjson(d));

// @@ Q29 | $out: materializar un resumen por artista en una nueva colección
db = db.getSiblingDB("streaming_musical");
db.reproducciones.aggregate([
  { $lookup: { from: "canciones", localField: "cancion_id", foreignField: "_id", as: "c" } },
  { $unwind: "$c" },
  { $group: { _id: "$c.artista.nombre", reproducciones: { $sum: 1 },
              oyentes_unicos: { $addToSet: "$usuario_id" }, minutos: { $sum: { $divide: ["$segundos_escuchados", 60] } } } },
  { $project: { reproducciones: 1, oyentes_unicos: { $size: "$oyentes_unicos" }, minutos: { $round: ["$minutos", 1] } } },
  { $sort: { reproducciones: -1 } },
  { $out: "resumen_artistas" }
]);
print("Documentos en resumen_artistas: " + db.resumen_artistas.countDocuments());
db.resumen_artistas.find().sort({ reproducciones: -1 }).limit(5).forEach(d => printjson(d));
