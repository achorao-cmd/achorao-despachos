import { useEffect, useMemo, useRef, useState } from "react";

const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxhNBkssonVACbSDoNk0Ofxvm6b8rjvRVbkfysllRcgZ8Spx2UHTMEzpxEGWrchQgv5Sg/exec";

const USUARIOS = [
  { nombre: "Anto", pin: "1111" },
  { nombre: "Enrique", pin: "2222" },
  { nombre: "Elias", pin: "3333" },
];

const ESTADOS = ["Empaquetado", "En ruta", "En Shalom", "Entregado", "No entregado", "Reprogramado"];
const TIEMPO_INACTIVIDAD = 5 * 60 * 1000;

export default function App() {
  const [usuarioActivo, setUsuarioActivo] = useState(null);
  const [usuarioLogin, setUsuarioLogin] = useState("Anto");
  const [pin, setPin] = useState("");

  const [pedido, setPedido] = useState("");
  const [estado, setEstado] = useState("Empaquetado");
  const [agencia, setAgencia] = useState("");
  const [codigoRecojo, setCodigoRecojo] = useState("1639");
  const [voucherURL, setVoucherURL] = useState("");
  const [voucherBase64, setVoucherBase64] = useState("");
  const [voucherNombre, setVoucherNombre] = useState("");
  const [observacion, setObservacion] = useState("");

  const [registros, setRegistros] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);

  const timerRef = useRef(null);
  const inputRef = useRef(null);

  const esShalom = estado === "En Shalom";

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
    setPin("");
    setMensaje(`✅ Sesión iniciada: ${usuario.nombre}`);

    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const contadorUsuario = useMemo(() => {
    return registros.filter((r) => r.motorizado === usuarioActivo).length;
  }, [registros, usuarioActivo]);

  const registrosFiltrados = registros.filter((r) =>
    r.pedido.toLowerCase().includes(busqueda.toLowerCase())
  );

  const limpiarCampos = () => {
    setPedido("");
    setAgencia("");
    setCodigoRecojo("1639");
    setVoucherURL("");
    setVoucherBase64("");
    setVoucherNombre("");
    setObservacion("");
  };

  const cargarVoucher = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      setVoucherBase64(reader.result);
      setVoucherNombre(file.name);
      setMensaje(`📷 Voucher cargado: ${file.name}`);
    };

    reader.readAsDataURL(file);
  };

  const registrar = async (e) => {
    e.preventDefault();
    reiniciarTimer();

    const pedidoLimpio = pedido.trim().toUpperCase();
    if (!pedidoLimpio || !usuarioActivo || !estado) return;

    const duplicado = registros.some(
      (r) => r.pedido === pedidoLimpio && r.estado === estado
    );

    if (duplicado) {
      setMensaje(`⚠️ ${pedidoLimpio} ya fue registrado como "${estado}"`);
      setPedido("");
      return;
    }

    if (esShalom && !codigoRecojo.trim()) {
      setMensaje("⚠️ Falta el código de recojo");
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
      limpiarCampos();
    } catch (error) {
      console.error(error);
      setMensaje("❌ Error al guardar en Google Sheets");
    }

    setGuardando(false);
    setTimeout(() => inputRef.current?.focus(), 100);
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
      <div style={styles.card}>
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

        <label style={styles.label}>Etapa / Estado</label>
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          style={styles.select}
        >
          {ESTADOS.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>

        <form onSubmit={registrar} style={styles.form}>
          <input
            ref={inputRef}
            value={pedido}
            onChange={(e) => setPedido(e.target.value)}
            placeholder="Escanea o escribe #15727"
            autoFocus
            style={styles.input}
          />

          {esShalom && (
            <>
              <input
                value={agencia}
                onChange={(e) => setAgencia(e.target.value)}
                placeholder="Agencia Shalom / Marvisur"
                style={styles.inputSmall}
              />

              <input
                value={codigoRecojo}
                onChange={(e) => setCodigoRecojo(e.target.value)}
                placeholder="Código de recojo"
                style={styles.inputSmall}
              />

              <label style={styles.uploadButton}>
                📷 Tomar/subir voucher
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={cargarVoucher}
                  style={{ display: "none" }}
                />
              </label>

              {voucherNombre && (
                <div style={styles.fileOk}>
                  ✅ Voucher listo: {voucherNombre}
                </div>
              )}

              <input
                value={voucherURL}
                onChange={(e) => setVoucherURL(e.target.value)}
                placeholder="Link manual del voucher en Drive (opcional)"
                style={styles.inputSmall}
              />

              <input
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                placeholder="Observación opcional"
                style={styles.inputSmall}
              />
            </>
          )}

          <button disabled={guardando} style={styles.bigButton}>
            {guardando ? "Guardando..." : "REGISTRAR"}
          </button>
        </form>

        {mensaje && <div style={styles.message}>{mensaje}</div>}

        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar pedido..."
          style={styles.search}
        />

        <h3>Últimos registros</h3>

        {registrosFiltrados.length === 0 ? (
          <p style={{ opacity: 0.7 }}>Aún no hay registros.</p>
        ) : (
          <div style={styles.list}>
            {registrosFiltrados.map((r, i) => (
              <div key={i} style={styles.item}>
                <strong>{r.pedido}</strong>
                <span>{r.motorizado}</span>
                <span>{r.estado}</span>
                <small>{r.hora}</small>
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
    gap: 10,
  },
  item: {
    background: "#1d1f27",
    padding: 14,
    borderRadius: 10,
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr 1fr 0.8fr",
    gap: 8,
    alignItems: "center",
  },
};