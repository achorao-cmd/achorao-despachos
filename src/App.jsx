import imageCompression from "browser-image-compression";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect, useMemo, useRef, useState } from "react";

const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxhNBkssonVACbSDoNk0Ofxvm6b8rjvRVbkfysllRcgZ8Spx2UHTMEzpxEGWrchQgv5Sg/exec";

const USUARIOS = [
  { nombre: "Anto", pin: "1111" },
  { nombre: "Enrique", pin: "2222" },
  { nombre: "Elias", pin: "3333" },
  { nombre: "Karlo", pin: "4444" },
];

const ESTADOS_MOTORIZADO = ["Empaquetado", "En ruta", "Entregado", "No entregado", "Reprogramado"];
const ESTADOS_AGENCIA = ["Empaquetado", "En agencia"];
const TIEMPO_INACTIVIDAD = 5 * 60 * 1000;

export default function App() {
  const ruta = window.location.pathname;

  if (ruta === "/tracking") return <TrackingCliente />;
  if (ruta === "/admin") return <PanelAdmin />;

  return <AppInterna />;
}

function TrackingCliente() {
  const [pedido, setPedido] = useState("");
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [scannerActivo, setScannerActivo] = useState(false);

  const buscarPedido = async (e) => {
    e.preventDefault();

    const pedidoLimpio = pedido.replace("#", "").trim().toUpperCase();

    if (!pedidoLimpio) {
      setMensaje("Escribe tu número de pedido.");
      return;
    }

    setCargando(true);
    setMensaje("");
    setResultado(null);

    try {
      const res = await fetch(`${GOOGLE_SCRIPT_URL}?pedido=${pedidoLimpio}`);
      const data = await res.json();

      if (!data.encontrado) {
        setMensaje("No encontramos ese pedido todavía. Revisa el número o intenta más tarde.");
      } else {
        setResultado(data);
      }
    } catch (error) {
      console.error(error);
      setMensaje("No pudimos consultar el pedido.");
    }

    setCargando(false);
  };

  const eventos = resultado?.eventos || [];
  const tieneAgencia = eventos.some((e) => e.estado === "En agencia");

  const PASOS = tieneAgencia
    ? [
        { key: "Empaquetado", titulo: "📦 Empaquetado", desc: "Tu pedido ya fue preparado." },
        { key: "En ruta", titulo: "🚚 En camino a agencia", desc: "Estamos llevando tu pedido a la agencia." },
        { key: "En agencia", titulo: "🏢 En agencia", desc: "Tu pedido ya fue dejado en agencia. Desde aquí continúa con el operador." },
      ]
    : [
        { key: "Empaquetado", titulo: "📦 Empaquetado", desc: "Tu pedido ya fue preparado." },
        { key: "En ruta", titulo: "🚚 En ruta", desc: "Tu pedido salió con nuestro equipo." },
        { key: "Entregado", titulo: "✅ Entregado", desc: "Pedido entregado correctamente." },
      ];

  const estadosActivos = eventos.map((e) => e.estado);
  const obtenerEvento = (estado) => eventos.find((e) => e.estado === estado);

    return (
      <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>📦 Rastrea tu pedido</h1>

        <p style={{ opacity: 0.8 }}>Ingresa tu número de pedido Achorao.</p>

        <form onSubmit={buscarPedido}>
          <input
            value={pedido}
            onChange={(e) => setPedido(e.target.value)}
            placeholder="Ej: 15727"
            style={styles.input}
            autoFocus
            inputMode="numeric"
            pattern="[0-9]*"
          />

          <button style={styles.bigButton}>
            {cargando ? "Buscando..." : "BUSCAR PEDIDO"}
          </button>
        </form>

        {mensaje && <div style={styles.message}>{mensaje}</div>}

        {resultado && (
          <div style={{ marginTop: 30 }}>
            <h2 style={{ marginBottom: 24 }}>Pedido #{resultado.pedido}</h2>

            <div style={styles.timeline}>
              {PASOS.map((paso, i) => {
                const activo = estadosActivos.includes(paso.key);
                const evento = obtenerEvento(paso.key);
                const agenciaTexto = String(evento?.agencia || "").toLowerCase();
                const esMarvisur = agenciaTexto.includes("marvisur");

                return (
                  <div
                    key={i}
                    style={{
                      ...styles.timelineItem,
                      opacity: activo ? 1 : 0.35,
                      border: activo ? "1px solid #ff7a00" : "1px solid #2b2b2b",
                    }}
                  >
                    <div
                      style={{
                        ...styles.dot,
                        background: activo ? "#ff7a00" : "#3b3b3b",
                      }}
                    >
                      {activo ? "✓" : "•"}
                    </div>

                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: 20, display: "block", marginBottom: 4 }}>
                        {paso.titulo}
                      </strong>

                      <p style={{ margin: "0 0 10px", opacity: 0.8 }}>{paso.desc}</p>

                      {evento && (
                        <>
                          <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 6 }}>
                            {evento.fecha} · {evento.hora}
                          </div>

                          {evento.agencia && (
                            <div style={{ marginBottom: 6 }}>
                              Agencia: <strong>{evento.agencia}</strong>
                            </div>
                          )}

                          {evento.codigoRecojo && evento.estado === "En agencia" && (
                            <div style={{ background: "#1d1f27", padding: 10, borderRadius: 10, marginTop: 10 }}>
                              Código de recojo:
                              <div style={{ fontSize: 30, fontWeight: "bold", color: "#ff7a00", marginTop: 6 }}>
                                {evento.codigoRecojo}
                              </div>
                            </div>
                          )}

                          {evento.estado === "En agencia" && (
                            <a
                              href={esMarvisur ? "https://www.marvisur.com/" : "https://rastrea.shalom.pe/"}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                color: "#ff8a00",
                                fontWeight: "bold",
                                display: "block",
                                marginTop: 12,
                                textDecoration: "none",
                              }}
                            >
                              {esMarvisur ? "Rastrear en Marvisur →" : "Rastrear en Shalom →"}
                            </a>
                          )}

                          {evento.voucherURL && (
                            <a href={evento.voucherURL} target="_blank" rel="noreferrer" style={styles.link}>
                              Ver voucher
                            </a>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
function PanelAdmin() {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroMotorizado, setFiltroMotorizado] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  const cargarAdmin = async () => {
    setCargando(true);
    try {
      const res = await fetch(`${GOOGLE_SCRIPT_URL}?modo=admin`);
      const data = await res.json();

      if (data.ok) {
        setRegistros(data.registros || []);
      }
    } catch (error) {
      console.error(error);
    }

    setCargando(false);
  };

  useEffect(() => {
    cargarAdmin();
  }, []);

  const filtrados = registros.filter((r) => {
    const texto = `${r.pedido} ${r.motorizado} ${r.estado} ${r.agencia}`.toLowerCase();

    const coincideBusqueda = texto.includes(busqueda.toLowerCase());
    const coincideMotorizado = !filtroMotorizado || r.motorizado === filtroMotorizado;
    const coincideEstado = !filtroEstado || r.estado === filtroEstado;

    return coincideBusqueda && coincideMotorizado && coincideEstado;
  });

  const registrosActuales = Object.values(
  filtrados.reduce((acc, r) => {
    const pedidoKey = String(r.pedido || "").trim();

    if (!pedidoKey) return acc;

    const fechaActual = new Date(r.registroReal || `${r.fecha} ${r.hora}`);
    const fechaGuardada = acc[pedidoKey]
      ? new Date(acc[pedidoKey].registroReal || `${acc[pedidoKey].fecha} ${acc[pedidoKey].hora}`)
      : null;

    if (!acc[pedidoKey] || fechaActual > fechaGuardada) {
      acc[pedidoKey] = r;
    }

    return acc;
  }, {})
);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>📊 Panel Admin</h1>

        <button onClick={cargarAdmin} style={styles.bigButton} disabled={cargando}>
          {cargando ? "Actualizando..." : "Actualizar"}
        </button>

        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar pedido, motorizado, estado..."
          style={styles.search}
        />

        <select
          value={filtroMotorizado}
          onChange={(e) => setFiltroMotorizado(e.target.value)}
          style={styles.select}
        >
          <option value="">Todos los motorizados</option>
          {USUARIOS.map((u) => (
            <option key={u.nombre} value={u.nombre}>
              {u.nombre}
            </option>
          ))}
        </select>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          style={styles.select}
        >
          <option value="">Todos los estados</option>
          <option value="Empaquetado">Empaquetado</option>
          <option value="En ruta">En ruta</option>
          <option value="En agencia">En agencia</option>
          <option value="Entregado">Entregado</option>
          <option value="No entregado">No entregado</option>
          <option value="Reprogramado">Reprogramado</option>
        </select>

        {cargando ? (
          <p>Cargando registros...</p>
        ) : (
          <>
            <h3>Pedidos actuales: {registrosActuales.length}</h3>

            <div style={styles.list}>
              {registrosActuales.map((r, i) => (
                <div key={i} style={styles.adminItem}>
                  <div style={styles.adminTop}>
                    <strong style={styles.adminPedido}>Pedido: {String(r.pedido || "").slice(0, 18)}</strong>
                    <span style={styles.adminEstado}>{r.estado}</span>
                  </div>

                  <div style={styles.adminMeta}>
                    <span>Motorizado: {r.motorizado || "-"}</span>
                    <span>Hora: {r.hora || "-"}</span>
                  </div>

                  {r.agencia && (
                    <div style={styles.adminMeta}>
                      <span>Agencia: {r.agencia}</span>
                      {r.codigoRecojo && <span>Código: {r.codigoRecojo}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function limpiarCodigoPedido(valor) {
  const texto = String(valor || "").trim();

  const matchId = texto.match(/"id"\s*:\s*"([^"]+)"/i);
  if (matchId?.[1]) return matchId[1].trim();

  const matchEnvio = texto.match(/Env[ií]o[:\s#]*([0-9]+)/i);
  if (matchEnvio?.[1]) return matchEnvio[1].trim();

  const matchVenta = texto.match(/Venta[:\s#]*([0-9]+)/i);
  if (matchVenta?.[1]) return matchVenta[1].trim();

  return texto.replace("#", "").trim().toUpperCase();
}
function AppInterna() {
  const [usuarioActivo, setUsuarioActivo] = useState(null);
  const [usuarioLogin, setUsuarioLogin] = useState("Anto");
  const [pin, setPin] = useState("");

  const [pedido, setPedido] = useState("");
  const [estado, setEstado] = useState("Empaquetado");
  const [tipoEnvio, setTipoEnvio] = useState("Motorizado");
  const [agencia, setAgencia] = useState("");
  const [codigoRecojo, setCodigoRecojo] = useState("");
  const [voucherURL, setVoucherURL] = useState("");
  const [voucherBase64, setVoucherBase64] = useState("");
  const [voucherNombre, setVoucherNombre] = useState("");
  const [observacion, setObservacion] = useState("");
  const [scannerActivo, setScannerActivo] = useState(false);

  const [registros, setRegistros] = useState([]);
  const cargarHistorialDia = async (usuario) => {
    try {
      const res = await fetch(
        `${GOOGLE_SCRIPT_URL}?modo=interno&usuario=${encodeURIComponent(usuario)}`
      );
      const data = await res.json();

      if (data.ok) {
        setRegistros(data.registros || []);
      }
    } catch (error) {
      console.error(error);
    }
  };
  const [busqueda, setBusqueda] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [flashOk, setFlashOk] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const timerRef = useRef(null);
  const inputRef = useRef(null);

  const esAgencia = estado === "En agencia";

  const requiereFoto = [
    "Entregado",
    "En agencia",
    "Reprogramado",
  ].includes(estado);

  const requiereObservacion = [
    "No entregado",
    "Reprogramado",
  ].includes(estado);

  const horaActual = new Date().getHours();
  const puedeEmpaquetar = horaActual < 17;

  const ESTADOS_GARANTIA = [
  "Empaquetado",
  "En proveedor",
  "En revisión",
  "Listo para recoger",
  "Recogido",
  "Devuelto al cliente",
  "Cerrado con nota de crédito",
];

const estadosDisponibles =
  tipoEnvio === "Agencia"
    ? ESTADOS_AGENCIA
    : tipoEnvio === "Garantía"
    ? ESTADOS_GARANTIA
    : ESTADOS_MOTORIZADO;

  const ORDEN_ESTADOS = {
  Empaquetado: 1,
  "En ruta": 2,
  "En agencia": 2,
  Entregado: 3,
  "No entregado": 3,
  Reprogramado: 3,
  "En proveedor": 2,
  "En revisión": 3,
  "Listo para recoger": 4,
  Recogido: 5,
  "Devuelto al cliente": 6,
  "Cerrado con nota de crédito": 6,
};

  const ultimoEstadoPedido = (pedidoBuscado) => {
    const pedidoLimpio = String(pedidoBuscado || "").trim().toUpperCase();

    const eventos = registros.filter(
      (r) => String(r.pedido || "").trim().toUpperCase() === pedidoLimpio
    );

    if (eventos.length === 0) return "";

    return eventos.reduce((ultimo, actual) => {
      const ordenActual = ORDEN_ESTADOS[actual.estado] || 0;
      const ordenUltimo = ORDEN_ESTADOS[ultimo.estado] || 0;

      return ordenActual > ordenUltimo ? actual : ultimo;
    }).estado;
  };

  const esRetroceso = (pedidoBuscado, nuevoEstado) => {
    const ultimo = ultimoEstadoPedido(pedidoBuscado);
    if (!ultimo) return false;

    return (ORDEN_ESTADOS[nuevoEstado] || 0) < (ORDEN_ESTADOS[ultimo] || 0);
  };
  useEffect(() => {

  if (estado !== "En agencia") {
    setAgencia("");
    setCodigoRecojo("");
    setVoucherURL("");
    setVoucherBase64("");
    setVoucherNombre("");
  }
}, [estado]);

  const cerrarSesion = () => {
    setUsuarioActivo(null);
    setPin("");
    setPedido("");
    setMensaje("🔒 Sesión cerrada por seguridad");
  };

  const reiniciarTimer = () => {
    if (!usuarioActivo) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(cerrarSesion, TIEMPO_INACTIVIDAD);
  };

  useEffect(() => {
    reiniciarTimer();
    return () => clearTimeout(timerRef.current);
  }, [usuarioActivo]);

  const login = (e) => {
    e.preventDefault();

    const usuario = USUARIOS.find(
      (u) => u.nombre === usuarioLogin && u.pin === pin
    );

    if (!usuario) {
      setMensaje("❌ PIN incorrecto");
      return;
    }

    setUsuarioActivo(usuario.nombre);
    cargarHistorialDia(usuario.nombre);
    setPin("");
    setMensaje(`✅ Sesión iniciada: ${usuario.nombre}`);

    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const contadorUsuario = useMemo(() => {
    return registros.filter((r) => r.motorizado === usuarioActivo).length;
  }, [registros, usuarioActivo]);

  const registrosFiltrados = registros.filter((r) =>
    String(r.pedido || "").toLowerCase().includes(busqueda.toLowerCase())
  );

  const registrosUnicos = Object.values(
    registrosFiltrados.reduce((acc, r) => {
      if (!acc[r.pedido]) acc[String(r.pedido || "")] = r;
      return acc;
    }, {})
  );

  const limpiarCampos = () => {
    setPedido("");
    setAgencia("");
    setCodigoRecojo("");
    setVoucherURL("");
    setVoucherBase64("");
    setVoucherNombre("");
    setObservacion("");
  };

  const cargarVoucher = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setMensaje("⏳ Comprimiendo imagen...");

      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.25,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      });

      const reader = new FileReader();

      reader.onload = () => {
        setVoucherBase64(reader.result);
        setVoucherNombre(compressedFile.name || file.name);
        setMensaje(`📷 Imagen lista: ${Math.round(compressedFile.size / 1024)} KB`);
      };

      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error(error);
      setMensaje("❌ No se pudo comprimir la imagen.");
    }
  };

  const registrar = async (e) => {
    e.preventDefault();
    reiniciarTimer();

    const pedidoLimpio = limpiarCodigoPedido(pedido);
    if (!pedidoLimpio || !usuarioActivo || !estado) return;
    if (estado === "Empaquetado" && !puedeEmpaquetar) {
      setMensaje("⛔ Ya no se puede empaquetar después de las 5pm.");
      return;
    }
    if (esRetroceso(pedidoLimpio, estado)) {
      const ultimo = ultimoEstadoPedido(pedidoLimpio);
      setMensaje(
        `⚠️ No puedes retroceder el pedido ${pedidoLimpio} de "${ultimo}" a "${estado}"`
      );
      return;
    }

    const duplicado = registros.some(
      (r) => r.pedido === pedidoLimpio && r.estado === estado
    );

    if (duplicado) {
      setMensaje(`⚠️ ${pedidoLimpio} ya fue registrado como "${estado}"`);
      setPedido("");
      return;
    }

    if (esAgencia && !codigoRecojo.trim()) {
      setMensaje("⚠️ Falta el código de recojo");
      return;
    }
    if (requiereFoto && !voucherURL.trim() && !voucherBase64) {
      setMensaje("Sube una foto/evidencia antes de registrar.");
      return;
    }

    if (requiereObservacion && !observacion.trim()) {
      setMensaje("Escribe una observación antes de registrar.");
      return;
    }
    const now = new Date();

    const nuevoRegistro = {
      pedido: pedidoLimpio,
      motorizado: usuarioActivo,
      estado,
      hora: now.toLocaleTimeString("es-PE"),
      fecha: now.toLocaleDateString("es-PE"),
      etapa: estado,
      agencia: agencia.trim(),
      codigoRecojo: codigoRecojo.trim(),
      voucherURL: voucherURL.trim(),
      voucherBase64,
      voucherNombre: voucherNombre
        ? `${pedidoLimpio}_${usuarioActivo}_${voucherNombre}`
        : "",
      observacion: observacion.trim(),
    };

    setGuardando(true);

    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(nuevoRegistro),
      });

      setRegistros([nuevoRegistro, ...registros]);
      setMensaje(`✅ ${pedidoLimpio} guardado como "${estado}"`);
      setFlashOk(true);

      setTimeout(() => {
        setFlashOk(false);
      }, 1000);
      limpiarCampos();
    } catch (error) {
      console.error(error);
      setMensaje("❌ Error al guardar en Google Sheets");
    }

    setGuardando(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const siguienteEstado = (estadoActual) => {
    if (estadoActual === "Empaquetado") {
      return tipoEnvio === "Agencia" ? "En agencia" : "En ruta";
    }

    if (estadoActual === "En ruta") return "Entregado";
    if (estadoActual === "Reprogramado") return "En ruta";

    return "";
  };

  const usarPedidoRapido = (pedidoSeleccionado, nuevoEstado) => {
    if (!nuevoEstado) return;

    const pedidoTexto = String(pedidoSeleccionado || "").trim().toUpperCase();

    const ultimoRegistro = registros.find(
      (r) => String(r.pedido || "").trim().toUpperCase() === pedidoTexto
    );

    if (nuevoEstado === "En ruta") {
      registrarPedidoDirecto(pedidoTexto, "En ruta");
      return;
    }

    setPedido(pedidoTexto);
    setEstado(nuevoEstado);

    if (nuevoEstado === "Entregado") {
      setTipoEnvio("Motorizado");
      setPedido(pedidoTexto);
      setEstado("Entregado");

      setTimeout(() => {
        document.getElementById("fotoEntregaInput")?.click();
      }, 200);

      return;
    }

    if (nuevoEstado === "En agencia" && ultimoRegistro) {
      setTipoEnvio("Agencia");
      setAgencia(ultimoRegistro.agencia || "");
      setCodigoRecojo(ultimoRegistro.codigoRecojo || "");
    }

    setTimeout(() => inputRef.current?.focus(), 100);
  };
  const registrarPedidoDirecto = async (pedidoDirecto, estadoDirecto) => {
    const pedidoLimpio = limpiarCodigoPedido(pedidoDirecto);

    if (!pedidoLimpio || !usuarioActivo || !estadoDirecto) return;

    const duplicado = registros.some(
      (r) => r.pedido === pedidoLimpio && r.estado === estadoDirecto
    );

    if (duplicado) {
      setMensaje(`⚠️ ${pedidoLimpio} ya fue registrado como "${estadoDirecto}"`);
      return;
    }

    const now = new Date();

    const nuevoRegistro = {
      pedido: pedidoLimpio,
      motorizado: usuarioActivo,
      estado: estadoDirecto,
      hora: now.toLocaleTimeString("es-PE"),
      fecha: now.toLocaleDateString("es-PE"),
      etapa: estadoDirecto,
      agencia: agencia.trim(),
      codigoRecojo: codigoRecojo.trim(),
      voucherURL: "",
      voucherBase64: "",
      voucherNombre: "",
      observacion: "",
    };

    setGuardando(true);

    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(nuevoRegistro),
      });

      setRegistros([nuevoRegistro, ...registros]);
      setMensaje(`✅ ${pedidoLimpio} guardado como "${estadoDirecto}"`);
      setFlashOk(true);

      setTimeout(() => {
        setFlashOk(false);
      }, 1000);
      setPedido("");
    } catch (error) {
      console.error(error);
      setMensaje("❌ Error al guardar en Google Sheets");
    }

    setGuardando(false);
  };
    const iniciarScanner = () => {
      setScannerActivo(true);

      setTimeout(() => {
        const scanner = new Html5QrcodeScanner(
          "reader",
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            videoConstraints: {
              facingMode: { ideal: "environment" }
            }
          },
          false
        );

        scanner.render(
          async (decodedText) => {
            const pedidoEscaneado = limpiarCodigoPedido(decodedText);

            setPedido(pedidoEscaneado);
            setScannerActivo(false);
            scanner.clear();

            if (estado === "Empaquetado") {
              await registrarPedidoDirecto(pedidoEscaneado, "Empaquetado");
            } else {
              setMensaje("✅ Pedido escaneado");
            }
          },
          () => {}
        );
      }, 100);
    };

    if (!usuarioActivo) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>🔐 Despacho Achorao</h1>

          <form onSubmit={login}>
            <label style={styles.label}>Usuario</label>
            <select
              value={usuarioLogin}
              onChange={(e) => setUsuarioLogin(e.target.value)}
              style={styles.select}
            >
              {USUARIOS.map((u) => (
                <option key={u.nombre} value={u.nombre}>
                  {u.nombre}
                </option>
              ))}
            </select>

            <label style={styles.label}>PIN</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Ingresa tu PIN"
              style={styles.input}
              autoFocus
            />

            <button style={styles.bigButton}>INGRESAR</button>
          </form>

          {mensaje && <div style={styles.message}>{mensaje}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page} onClick={reiniciarTimer} onKeyDown={reiniciarTimer}>
      <div
        style={{
          ...styles.card,
          border: flashOk ? "2px solid #00ff88" : "2px solid transparent",
          transition: "0.2s",
        }}
      >
        <h1 style={styles.title}>📦 Tracking Achorao</h1>

        <div style={styles.stats}>
          <div>
            <strong>{registros.length}</strong>
            <span>Total sesión</span>
          </div>
          <div>
            <strong>{contadorUsuario}</strong>
            <span>{usuarioActivo}</span>
          </div>
        </div>

        <div style={styles.userBox}>
          Sesión activa: <strong>{usuarioActivo}</strong>
          <button onClick={cerrarSesion} style={styles.logout}>
            Cerrar
          </button>
        </div>

        <label style={styles.label}>Tipo de envío</label>
        <select
          value={tipoEnvio}
          onChange={(e) => {
            const nuevoTipo = e.target.value;
            setTipoEnvio(nuevoTipo);
            setEstado(nuevoTipo === "Agencia" ? "Empaquetado" : "Empaquetado");
          }}
          style={styles.select}
        >
          <option>Motorizado</option>
          <option>Agencia</option>
          <option>Garantía</option>
        </select>

        <label style={styles.label}>Etapa / Estado</label>
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          style={styles.select}
        >
          {estadosDisponibles.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>

        <form onSubmit={registrar} style={styles.form}>
  <div style={{ display: "flex", gap: 8 }}>
    <input
      ref={inputRef}
      value={pedido}
      onChange={(e) =>
        setPedido(
          tipoEnvio === "Garantía"
            ? e.target.value
            : limpiarCodigoPedido(e.target.value)
        )
      }
      placeholder={
        tipoEnvio === "Garantía"
          ? "Ej: Garantía Razer / Igarashi"
          : "Escanea o escribe #15727"
      }
      inputMode={tipoEnvio === "Garantía" ? "text" : "numeric"}
      style={{ ...styles.input, flex: 1 }}
    />

    <button
      type="button"
      onClick={(e) => registrar(e)}
      style={styles.sendButton}
    >
      ➜
    </button>
  </div>

  {scannerActivo && (
    <div style={styles.scannerOverlay}>
      <div style={styles.scannerBox}>
        <div id="reader"></div>

        <button
          type="button"
          onClick={() => setScannerActivo(false)}
          style={styles.bigButton}
        >
          CERRAR CÁMARA
        </button>
      </div>
    </div>
  )}

  {tipoEnvio === "Agencia" && (
    <>
      <select
        value={agencia}
        onChange={(e) => setAgencia(e.target.value)}
        style={styles.select}
      >
        <option value="">Selecciona agencia</option>
        <option value="Shalom">Shalom</option>
        <option value="Marvisur">Marvisur</option>
        <option value="Olva">Olva</option>
        <option value="Otro">Otro</option>
      </select>

      <input
        value={codigoRecojo}
        onChange={(e) => setCodigoRecojo(e.target.value)}
        placeholder="Código de recojo"
        inputMode="numeric"
        pattern="[0-9]*"
        style={styles.input}
      />
    </>
  )}

  {requiereFoto && (
    <>
      <label style={styles.uploadButton}>
        {tipoEnvio === "Agencia"
          ? "🧾 Subir voucher de agencia"
          : estado === "Entregado"
          ? "📷 Tomar foto de entrega"
          : "📎 Subir evidencia"}
        <input
          type="file"
          accept="image/*"
          capture={estado === "Entregado" ? "environment" : undefined}
          onChange={cargarVoucher}
          style={{ display: "none" }}
        />
      </label>

      {voucherNombre && (
        <div style={styles.fileOk}>
          ✅ Voucher listo: {voucherNombre}
        </div>
      )}
    </>
  )}

  {estado !== "Empaquetado" && (
    <input
      value={observacion}
      onChange={(e) => setObservacion(e.target.value)}
      placeholder="Observación opcional"
      style={styles.inputSmall}
    />
  )}

  {estado === "Empaquetado" && (
    <button
      type="button"
      onClick={iniciarScanner}
      style={styles.bigButton}
    >
      ESCANEAR PEDIDO
    </button>
  )}

  {estado === "Entregado" && (
    <button disabled={guardando} style={styles.bigButton}>
      {guardando ? "Guardando..." : "REGISTRAR ENTREGA"}
    </button>
  )}

  {estado === "En agencia" && (
    <button disabled={guardando} style={styles.bigButton}>
      {guardando ? "Guardando..." : "REGISTRAR EN AGENCIA"}
    </button>
  )}
</form>

        {mensaje && <div style={styles.message}>{mensaje}</div>}

        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar pedido..."
          inputMode={tipoEnvio === "Garantía" ? "text" : "numeric"}
          pattern={tipoEnvio === "Garantía" ? undefined : "[0-9]*"}
          style={styles.search}
        />

        <h3>Últimos registros</h3>

        {registrosFiltrados.length === 0 ? (
          <p style={{ opacity: 0.7 }}>Aún no hay registros.</p>
        ) : (
          <div style={styles.list}>
            {registrosUnicos.map((r, i) => (
              <div key={i} style={styles.item}>
                <strong>{r.pedido}</strong>
                <span>{r.estado}</span>
                <small>{r.hora}</small>

                {siguienteEstado(r.estado) && (
                  <button
                    type="button"
                    onClick={() => usarPedidoRapido(r.pedido, siguienteEstado(r.estado))}
                    style={styles.miniButton}
                  >
                    {siguienteEstado(r.estado) === "En ruta"
                    ? "DESPACHAR"
                    : siguienteEstado(r.estado) === "En agencia"
                    ? "ENVIAR A AGENCIA"
                    : siguienteEstado(r.estado) === "Entregado"
                    ? "ENTREGAR"
                    : siguienteEstado(r.estado)}
                  </button>
                )}  
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
const styles = {
  page: {
    minHeight: "100vh",
    background: "#111217",
    color: "#fff",
    fontFamily: "Arial",
    display: "flex",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 520,
    textAlign: "center",
  },
  title: {
    fontSize: 38,
    marginBottom: 20,
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginBottom: 20,
  },
  userBox: {
    background: "#1d1f27",
    padding: 14,
    borderRadius: 10,
    marginBottom: 20,
  },
  logout: {
    marginLeft: 12,
    padding: "6px 10px",
    borderRadius: 6,
    border: "none",
  },
  label: {
    display: "block",
    textAlign: "left",
    marginTop: 12,
    marginBottom: 6,
    fontWeight: "bold",
  },
  select: {
    width: "100%",
    padding: 14,
    fontSize: 18,
    borderRadius: 8,
  },
  form: {
    marginTop: 20,
  },
  input: {
    width: "100%",
    padding: 18,
    fontSize: 22,
    borderRadius: 8,
    boxSizing: "border-box",
    marginBottom: 12,
  },
  inputSmall: {
    width: "100%",
    padding: 14,
    fontSize: 16,
    borderRadius: 8,
    boxSizing: "border-box",
    marginBottom: 10,
  },
  uploadButton: {
    display: "block",
    width: "100%",
    padding: 16,
    fontSize: 18,
    fontWeight: "bold",
    borderRadius: 8,
    boxSizing: "border-box",
    marginBottom: 10,
    background: "#2d7dff",
    color: "#fff",
    cursor: "pointer",
  },
  fileOk: {
    background: "#14351f",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    fontWeight: "bold",
  },
  bigButton: {
    width: "100%",
    padding: 20,
    fontSize: 22,
    fontWeight: "bold",
    borderRadius: 10,
    background: "#ff7a00",
    color: "#000",
    border: "none",
  },
  message: {
    marginTop: 16,
    padding: 14,
    background: "#222",
    borderRadius: 8,
    fontWeight: "bold",
  },
  
  search: {
    width: "100%",
    padding: 14,
    fontSize: 16,
    borderRadius: 8,
    boxSizing: "border-box",
    marginTop: 24,
  },

  list: {
    display: "grid",
    gap: 8,
    width: "100%",
    maxWidth: "100%",
    overflowX: "hidden",
  },

  item: {
    background: "#1d1f27",
    padding: 10,
    borderRadius: 10,
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 6,
    alignItems: "center",
    wordBreak: "break-word",
    overflowWrap: "break-word",
    maxWidth: "100%",
    boxSizing: "border-box",
  },

  timeline: {
    display: "grid",
    gap: 16,
    marginTop: 20,
  },

  timelineItem: {
    display: "grid",
    gridTemplateColumns: "42px 1fr",
    gap: 12,
    background: "#1d1f27",
    padding: 16,
    borderRadius: 12,
  },

  dot: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    background: "#ff7a00",
    color: "#000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
  },

  link: {
    display: "inline-block",
    marginTop: 6,
    color: "#7db4ff",
    fontWeight: "bold",
  },

  alertBox: {
    marginTop: 20,
    padding: 18,
    background: "#2a1f0f",
    border: "1px solid #ff7a00",
    borderRadius: 12,
    textAlign: "center",
  },

  miniButton: {
    padding: "8px 10px",
    borderRadius: 8,
    border: "none",
    background: "#333",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
  },

  cameraButton: {
    width: 60,
    borderRadius: 10,
    border: "none",
    background: "#333",
    color: "#fff",
    fontSize: 22,
    cursor: "pointer",
  },

  scannerOverlay: {
    position: "fixed",
    inset: 0,
    background: "#000",
    zIndex: 9999,
    padding: 12,
    boxSizing: "border-box",
    overflow: "auto",
  },

  scannerBox: {
    width: "100%",
    maxWidth: 520,
    margin: "0 auto",
  },

  sendButton: {
    width: "58px",
    border: "none",
    borderRadius: "10px",
    background: "#2d2d2d",
    color: "#fff",
    fontSize: "24px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  adminPedido: {
    maxWidth: 180,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  adminItem: {
  background: "#1b1d26",
  borderRadius: 14,
  padding: 16,
  marginBottom: 10,
  border: "1px solid rgba(255,255,255,0.08)",
  },

  adminTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    marginBottom: 10,
  },

  adminPedido: {
    fontSize: 16,
    fontWeight: 900,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  adminEstado: {
    background: "#2d2d2d",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },

  adminMeta: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    fontSize: 14,
    opacity: 0.85,
    marginTop: 6,
  },
};