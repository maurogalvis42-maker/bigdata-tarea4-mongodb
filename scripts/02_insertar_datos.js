// =====================================================================
// Script 02: Inserción del conjunto de datos de prueba.
// Se generan 50 usuarios, 120 canciones y 600 reproducciones (770 docs)
// con un generador pseudoaleatorio con semilla fija, de modo que los
// resultados son idénticos cada vez que se ejecuta el script.
// Ejecutar:  mongosh streaming_musical scripts/02_insertar_datos.js
// =====================================================================

// @@ Q03 | Insertar el conjunto de datos de prueba (insertMany)
db = db.getSiblingDB("streaming_musical");

// Generador pseudoaleatorio (mulberry32) con semilla fija -> datos reproducibles
let semilla = 20261120;
function rnd() {
  semilla = (semilla + 0x6D2B79F5) | 0;
  let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function entero(min, max) { return Math.floor(rnd() * (max - min + 1)) + min; }
function elegir(lista) { return lista[Math.floor(rnd() * lista.length)]; }
function pad(n) { return String(n).padStart(3, "0"); }

const paises = { Colombia: ["Bogotá", "Medellín", "Cali", "Barranquilla"], México: ["CDMX", "Guadalajara", "Monterrey"],
  Argentina: ["Buenos Aires", "Córdoba"], España: ["Madrid", "Barcelona"], Chile: ["Santiago"], Perú: ["Lima"] };
const nombres = ["Laura", "Andrés", "Camila", "Juan", "Valentina", "Santiago", "Sofía", "Mateo", "Isabella", "Sebastián",
  "Mariana", "Nicolás", "Daniela", "Felipe", "Gabriela", "Tomás", "Paula", "Diego", "Natalia", "Alejandro"];
const apellidos = ["Gómez", "Rodríguez", "Martínez", "López", "García", "Pérez", "Sánchez", "Ramírez", "Torres", "Díaz"];
const generos = ["pop", "rock", "reggaeton", "salsa", "electrónica", "hip-hop", "vallenato", "jazz"];
const planes = ["free", "free", "premium", "premium", "familiar", "estudiante"];
const dispositivos = ["movil", "movil", "movil", "web", "escritorio", "smart_tv"];

// ---------- usuarios (50) ----------
const usuarios = [];
for (let i = 1; i <= 50; i++) {
  const pais = elegir(Object.keys(paises));
  const n = elegir(nombres), a = elegir(apellidos);
  usuarios.push({
    _id: "U" + pad(i),
    nombre: n + " " + a,
    email: (n + "." + a + i).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") + "@correo.com",
    pais: pais, ciudad: elegir(paises[pais]),
    edad: NumberInt(entero(15, 65)),
    plan: elegir(planes),
    fecha_registro: new Date(Date.UTC(entero(2021, 2025), entero(0, 11), entero(1, 28))),
    activo: rnd() > 0.1,
    preferencias: { generos_favoritos: [elegir(generos), elegir(generos)].filter((g, k, arr) => arr.indexOf(g) === k),
                    idioma: pais === "España" ? "es-ES" : "es-419" }
  });
}

// ---------- canciones (120) ----------
const palabras1 = ["Noche", "Luz", "Fuego", "Mar", "Cielo", "Ritmo", "Sueño", "Camino", "Corazón", "Lluvia", "Sol", "Viento"];
const palabras2 = ["Eterna", "de Verano", "Salvaje", "en Calma", "Perdida", "Brillante", "del Sur", "Infinita", "Rebelde", "Dorada"];
const artistas = [];
for (let k = 1; k <= 30; k++) artistas.push({ nombre: "Artista " + elegir(["Nova", "Luna", "Kairo", "Sativa", "Orion", "Bruma", "Delta", "Zafiro"]) + " " + k,
                                               pais: elegir(Object.keys(paises)) });
const canciones = [];
for (let i = 1; i <= 120; i++) {
  const genero = elegir(generos);
  const etiquetas = [];
  if (rnd() > 0.5) etiquetas.push("fiesta");
  if (rnd() > 0.6) etiquetas.push("relajante");
  if (rnd() > 0.7) etiquetas.push("entrenamiento");
  canciones.push({
    _id: "C" + pad(i),
    titulo: elegir(palabras1) + " " + elegir(palabras2) + (i % 7 === 0 ? " (Remix)" : ""),
    artista: elegir(artistas),
    album: "Álbum " + entero(1, 40),
    anio: NumberInt(entero(1995, 2026)),
    genero: genero,
    duracion_seg: NumberInt(entero(140, 330)),
    popularidad: NumberInt(entero(5, 95)),
    explicito: genero === "hip-hop" || genero === "reggaeton" ? rnd() > 0.4 : rnd() > 0.9,
    caracteristicas: { danceability: Math.round(rnd() * 100) / 100, energy: Math.round(rnd() * 100) / 100, tempo: entero(70, 180) },
    etiquetas: etiquetas
  });
}

// ---------- reproducciones (600) ----------
const reproducciones = [];
for (let i = 1; i <= 600; i++) {
  const c = elegir(canciones);
  const completada = rnd() > 0.35;
  const doc = {
    usuario_id: "U" + pad(entero(1, 50)),
    cancion_id: c._id,
    fecha: new Date(Date.UTC(2026, entero(0, 9), entero(1, 28), entero(0, 23), entero(0, 59))),
    segundos_escuchados: NumberInt(completada ? c.duracion_seg : entero(5, c.duracion_seg - 1)),
    completada: completada,
    dispositivo: elegir(dispositivos)
  };
  if (rnd() > 0.6) doc.calificacion = NumberInt(entero(1, 5));   // campo opcional (esquema flexible)
  reproducciones.push(doc);
}

const r1 = db.usuarios.insertMany(usuarios);
const r2 = db.canciones.insertMany(canciones);
const r3 = db.reproducciones.insertMany(reproducciones);
print("usuarios insertados:       " + Object.keys(r1.insertedIds).length);
print("canciones insertadas:      " + Object.keys(r2.insertedIds).length);
print("reproducciones insertadas: " + Object.keys(r3.insertedIds).length);
print("TOTAL documentos:          " + (db.usuarios.countDocuments() + db.canciones.countDocuments() + db.reproducciones.countDocuments()));

// @@ Q04 | Ver un documento de ejemplo de cada colección
db = db.getSiblingDB("streaming_musical");
print("--- usuarios ---");       printjson(db.usuarios.findOne({ _id: "U001" }));
print("--- canciones ---");      printjson(db.canciones.findOne({ _id: "C001" }));
print("--- reproducciones ---"); printjson(db.reproducciones.findOne({}, { _id: 0 }));
