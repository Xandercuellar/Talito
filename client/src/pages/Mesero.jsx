import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, dinero, hora } from '../api.js';
import { useAuth } from '../auth.jsx';
import Dialogo from '../components/Dialogo.jsx';
import Marca from '../components/Marca.jsx';
import { usePolling, useToast } from '../hooks.js';
import { generarReciboPdf } from '../recibo.js';

const ETIQUETA = {
  nueva: 'Esperando cocina',
  preparando: 'En preparación',
  lista: '¡Lista para servir!',
};

const sumar = (items) => (items ?? []).reduce((s, i) => s + i.cant * i.precio, 0);

function DialogoAgregar({ onAgregar, onCancelar }) {
  const [menu, setMenu] = useState(null);
  const [platilloId, setPlatilloId] = useState('');
  const [cant, setCant] = useState(1);
  const [nota, setNota] = useState('');

  useEffect(() => {
    api('/menu').then((m) => {
      setMenu(m);
      setPlatilloId(String(m[0]?.items[0]?.id ?? ''));
    }).catch(() => setMenu([]));
  }, []);

  if (menu === null) return <p className="cargando">Cargando menú…</p>;
  if (menu.length === 0) return <p className="vacio">No hay platillos disponibles.</p>;

  return (
    <form onSubmit={(e) => { e.preventDefault(); onAgregar(Number(platilloId), Number(cant), nota.trim()); }}>
      <div className="campo">
        <label htmlFor="ag-platillo-m">Platillo</label>
        <select id="ag-platillo-m" value={platilloId} onChange={(e) => setPlatilloId(e.target.value)}>
          {menu.map((c) => (
            <optgroup key={c.id} label={c.nombre}>
              {c.items.map((it) => <option key={it.id} value={it.id}>{it.nombre} · {dinero(it.precio)}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
      <div className="campo">
        <label htmlFor="ag-cant-m">Cantidad</label>
        <input id="ag-cant-m" type="number" min={1} max={50} required value={cant} onChange={(e) => setCant(e.target.value)} />
      </div>
      <div className="campo">
        <label htmlFor="ag-nota-m">Indicaciones (opcional)</label>
        <input id="ag-nota-m" type="text" maxLength={120} placeholder="Ej. sin cebolla, salsa aparte" value={nota} onChange={(e) => setNota(e.target.value)} />
      </div>
      <div className="dlg-acciones">
        <button type="button" className="btn btn-ghost" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn btn-primary">Agregar</button>
      </div>
    </form>
  );
}

function DialogoNuevaOrden({ onCrear, onCancelar }) {
  const [menu, setMenu] = useState(null);
  const [mesa, setMesa] = useState('');
  const [nombre, setNombre] = useState('');
  const [cantidades, setCantidades] = useState({});
  const [notas, setNotas] = useState({});
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api('/menu').then(setMenu).catch(() => setMenu([]));
  }, []);

  const totalItems = Object.values(cantidades).reduce((a, b) => a + b, 0);

  function cambiarCant(id, delta) {
    setCantidades((prev) => {
      const actual = prev[id] ?? 0;
      const nuevo = Math.max(0, actual + delta);
      if (nuevo === 0) {
        const { [id]: _, ...resto } = prev;
        return resto;
      }
      return { ...prev, [id]: nuevo };
    });
  }

  async function enviar(e) {
    e.preventDefault();
    if (totalItems === 0 || enviando) return;
    setEnviando(true);

    const items = Object.entries(cantidades).map(([id, cant]) => ({
      id: Number(id),
      cant,
      nota: (notas[id] ?? '').trim(),
    }));

    try {
      await onCrear({ mesa: Number(mesa), nombre: nombre.trim(), items });
    } finally {
      setEnviando(false);
    }
  }

  if (menu === null) return <p className="cargando">Cargando menú…</p>;

  return (
    <form onSubmit={enviar}>
      <div className="fila-2">
        <div className="campo">
          <label htmlFor="no-mesa">N.º de mesa</label>
          <input id="no-mesa" type="number" min={1} max={99} required value={mesa} onChange={(e) => setMesa(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="no-nombre">Cliente</label>
          <input id="no-nombre" type="text" maxLength={40} required placeholder="Nombre del cliente" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
      </div>

      <div style={{ maxHeight: '350px', overflowY: 'auto', margin: '12px 0', border: '1px solid var(--line)', borderRadius: '8px', padding: '10px' }}>
        {menu.map((cat) => (
          <div key={cat.id} style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: '0.95rem', color: 'var(--muted)', margin: '4px 0 8px' }}>{cat.nombre}</h3>
            {cat.items.map((it) => {
              const cant = cantidades[it.id] ?? 0;
              return (
                <div key={it.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ flex: 1, paddingRight: 8 }}>
                    <strong>{it.nombre}</strong> <small style={{ color: 'var(--muted)' }}>· {dinero(it.precio)}</small>
                    {cant > 0 && (
                      <input
                        type="text"
                        placeholder="Nota (sin salsa...)"
                        maxLength={120}
                        style={{ display: 'block', width: '100%', fontSize: '0.85rem', marginTop: 4, padding: '4px 8px', border: '1px solid var(--line)', borderRadius: 4 }}
                        value={notas[it.id] ?? ''}
                        onChange={(e) => setNotas((prev) => ({ ...prev, [it.id]: e.target.value }))}
                      />
                    )}
                  </div>
                  <div className="cantidad">
                    <button type="button" onClick={() => cambiarCant(it.id, -1)}>−</button>
                    <span>{cant}</span>
                    <button type="button" onClick={() => cambiarCant(it.id, 1)}>+</button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="dlg-acciones">
        <button type="button" className="btn btn-ghost" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={totalItems === 0 || enviando}>
          {enviando ? 'Creando orden…' : `Crear orden (${totalItems} platillos)`}
        </button>
      </div>
    </form>
  );
}

export default function Mesero() {
  const [datos, setDatos] = useState({ misPedidos: [], sinAsignar: [], llamadas: [], todos: [] });
  const [cargado, setCargado] = useState(false);
  const [sinRed, setSinRed] = useState(false);
  const [tab, setTab] = useState('mis-mesas'); // 'mis-mesas' | 'sin-asignar' | 'llamadas'
  const [pedidoParaAgregar, setPedidoParaAgregar] = useState(null);
  const [dlgNuevaOrden, setDlgNuevaOrden] = useState(false);
  const [trabajando, setTrabajando] = useState(false);

  const { usuario, salir } = useAuth();
  const { toast, aviso } = useToast();
  const avisoRef = useRef(aviso);
  avisoRef.current = aviso;

  const cargar = useCallback(async () => {
    try {
      const d = await api('/mesero');
      setDatos(d);
      setCargado(true);
      setSinRed(false);
    } catch (e) {
      if (e.status !== 401) setSinRed(true);
    }
  }, []);
  usePolling(cargar, 5000);

  async function ejecutar(accion) {
    setTrabajando(true);
    try {
      await accion();
    } catch (e) {
      avisoRef.current(e.message);
    } finally {
      setTrabajando(false);
      cargar();
    }
  }

  const tomarMesa = (p) => ejecutar(async () => {
    await api(`/pedidos/${p.id}/mesero`, { method: 'PATCH', body: { meseroId: usuario.sub } });
    aviso(`Mesa ${p.mesa} asignada a ti.`);
  });

  const atenderLlamada = (l) => ejecutar(async () => {
    await api(`/llamadas/${l.id}`, { method: 'PATCH' });
    aviso(`Llamada de Mesa ${l.mesa} atendida.`);
  });

  const agregarPlatillo = (p, platilloId, cant, nota) => ejecutar(async () => {
    await api(`/pedidos/${p.id}/items`, { method: 'POST', body: { platilloId, cant, nota } });
    setPedidoParaAgregar(null);
    aviso('Platillo agregado a la mesa.');
  });

  const crearOrden = ({ mesa, nombre, items }) => ejecutar(async () => {
    await api('/pedidos', {
      method: 'POST',
      body: { mesa, nombre, items, meseroId: usuario.sub },
    });
    setDlgNuevaOrden(false);
    aviso(`Orden creada para Mesa ${mesa} y asignada a ti.`);
  });

  const descargarPrecuenta = (p) => {
    const total = sumar(p.items);
    generarReciboPdf(
      {
        ...p,
        total,
        meseroNombre: p.meseroNombre || usuario.nombre,
      },
      { esPrecuenta: true, autoDescargar: true },
    );
    aviso(`Pre-cuenta descargada para Mesa ${p.mesa}.`);
  };

  const mis = datos.misPedidos;
  const sin = datos.sinAsignar;
  const llamadas = datos.llamadas;

  return (
    <>
      <header className="ca-top">
        <Marca />
        <nav className="enlaces-barra" aria-label="Navegación Mesero">
          <span className="btn btn-sm btn-ghost" aria-current="page">Panel Mesero</span>
          {usuario?.rol === 'admin' && (
            <>
              <Link className="btn btn-sm btn-ghost" to="/caja">Caja</Link>
              <Link className="btn btn-sm btn-ghost" to="/cocina">Cocina</Link>
              <Link className="btn btn-sm btn-ghost" to="/admin">Administración</Link>
            </>
          )}
          <button type="button" className="btn btn-sm btn-primary" onClick={() => setDlgNuevaOrden(true)}>
            + Tomar orden
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={salir}>
            Salir · {usuario?.nombre}
          </button>
        </nav>
      </header>

      {sinRed && (
        <p className="estado-red" role="alert" style={{ padding: '10px 28px', color: 'var(--chile)', fontWeight: 700 }}>
          Sin conexión con el servidor. Reintentando…
        </p>
      )}

      <main style={{ maxWidth: '1200px', margin: '20px auto', padding: '0 20px' }}>
        {llamadas.length > 0 && (
          <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '10px', padding: '12px 18px', marginBottom: 20 }}>
            <h2 style={{ fontSize: '1rem', color: '#92400e', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span> Mesas solicitando atención ({llamadas.length})</span>
            </h2>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {llamadas.map((l) => (
                <div key={l.id} style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span><strong>Mesa {l.mesa}</strong> · hace {l.min} min</span>
                  <button type="button" className="btn btn-sm btn-ghost" disabled={trabajando} onClick={() => atenderLlamada(l)}>
                    Atendida
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pestanas">
          <button
            type="button"
            className={`pestana-btn ${tab === 'mis-mesas' ? 'activa' : ''}`}
            onClick={() => setTab('mis-mesas')}
          >
            Mis mesas asignadas ({mis.length})
          </button>
          <button
            type="button"
            className={`pestana-btn ${tab === 'sin-asignar' ? 'activa' : ''}`}
            onClick={() => setTab('sin-asignar')}
          >
            Mesas sin mesero ({sin.length})
          </button>
          <button
            type="button"
            className={`pestana-btn ${tab === 'llamadas' ? 'activa' : ''}`}
            onClick={() => setTab('llamadas')}
          >
            Llamadas ({llamadas.length})
          </button>
        </div>

        {/* Tab 1: Mis Mesas Asignadas */}
        {tab === 'mis-mesas' && (
          <div>
            {!cargado ? (
              <p className="cargando">Cargando pedidos…</p>
            ) : mis.length === 0 ? (
              <div className="panel centro" style={{ padding: '40px 20px' }}>
                <p className="vacio" style={{ fontSize: '1.1rem' }}>No tienes mesas asignadas en este momento.</p>
                <p style={{ color: 'var(--muted)', marginTop: 8 }}>
                  Puedes tomar una orden con el botón <strong>+ Tomar orden</strong> o asignarte una mesa de la pestaña &quot;Mesas sin mesero&quot;.
                </p>
              </div>
            ) : (
              <div className="grid-mesero">
                {mis.map((p) => {
                  const total = sumar(p.items);
                  const esLista = p.estado === 'lista';
                  return (
                    <article key={p.id} className={`card-mesero ${esLista ? 'urgente' : ''}`}>
                      <div>
                        <div className="card-mesero-header">
                          <div>
                            <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--cafe)' }}>
                              Mesa {p.mesa}
                            </h2>
                            <p style={{ margin: '3px 0 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
                              {p.nombre} · hace {p.min} min
                            </p>
                          </div>
                          <span className={`badge ${esLista ? 'ok' : 'off'}`} style={{ fontWeight: 800 }}>
                            {ETIQUETA[p.estado] ?? p.estado}
                          </span>
                        </div>

                        {esLista && (
                          <div style={{ background: '#dcfce7', color: '#166534', padding: '6px 10px', borderRadius: 6, fontSize: '0.88rem', fontWeight: 700, marginBottom: 12 }}>
                            ¡La comida está lista en cocina para servir al cliente!
                          </div>
                        )}

                        <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--muted)', margin: '10px 0 6px' }}>
                          Detalle de la orden
                        </h3>
                        <ul className="card-mesero-items">
                          {p.items.map((it) => (
                            <li key={it.id}>
                              <div>
                                <span><strong>{it.cant}x</strong> {it.nombre}</span>
                                {it.nota && <small style={{ display: 'block', color: 'var(--muted)', fontStyle: 'italic' }}>({it.nota})</small>}
                              </div>
                              <span style={{ fontWeight: 600 }}>{dinero(it.cant * it.precio)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <div className="card-mesero-total">
                          <div>
                            <small style={{ display: 'block', color: 'var(--muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                              Total a pagar para el cliente
                            </small>
                            <strong>{dinero(total)}</strong>
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            onClick={() => descargarPrecuenta(p)}
                            title="Generar e imprimir pre-cuenta en PDF para mostrar al cliente"
                          >
                            Pre-cuenta PDF
                          </button>
                        </div>

                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            style={{ flex: 1 }}
                            onClick={() => setPedidoParaAgregar(p)}
                          >
                            + Agregar platillo
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Mesas sin Mesero */}
        {tab === 'sin-asignar' && (
          <div>
            {!cargado ? (
              <p className="cargando">Cargando mesas…</p>
            ) : sin.length === 0 ? (
              <div className="panel centro" style={{ padding: '40px 20px' }}>
                <p className="vacio">No hay mesas sin mesero asignado.</p>
              </div>
            ) : (
              <div className="grid-mesero">
                {sin.map((p) => {
                  const total = sumar(p.items);
                  return (
                    <article key={p.id} className="card-mesero">
                      <div>
                        <div className="card-mesero-header">
                          <div>
                            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Mesa {p.mesa}</h2>
                            <p style={{ margin: '3px 0 0', color: 'var(--muted)' }}>{p.nombre} · hace {p.min} min</p>
                          </div>
                          <span className="badge off">{ETIQUETA[p.estado] ?? p.estado}</span>
                        </div>
                        <ul className="card-mesero-items">
                          {p.items.map((it) => (
                            <li key={it.id}>
                              <span>{it.cant}x {it.nombre}</span>
                              <span>{dinero(it.cant * it.precio)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="card-mesero-total">
                          <small>Total de la cuenta</small>
                          <strong>{dinero(total)}</strong>
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary btn-block"
                          disabled={trabajando}
                          onClick={() => tomarMesa(p)}
                        >
                          Atender esta mesa / Asignármela
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Llamadas */}
        {tab === 'llamadas' && (
          <div className="panel">
            <h2>Llamadas activas de clientes</h2>
            {llamadas.length === 0 ? (
              <p className="vacio">No hay llamadas pendientes en este momento.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {llamadas.map((l) => (
                  <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--line)', borderRadius: 8 }}>
                    <div>
                      <strong style={{ fontSize: '1.1rem' }}>Mesa {l.mesa}</strong>
                      <span style={{ color: 'var(--muted)', marginLeft: 10 }}>solicita mesero hace {l.min} min</span>
                    </div>
                    <button type="button" className="btn btn-primary btn-sm" disabled={trabajando} onClick={() => atenderLlamada(l)}>
                      Marcar atendida
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <Dialogo
        abierto={Boolean(pedidoParaAgregar)}
        onCerrar={() => setPedidoParaAgregar(null)}
        titulo={`Agregar platillo a Mesa ${pedidoParaAgregar?.mesa}`}
      >
        {pedidoParaAgregar && (
          <DialogoAgregar
            onCancelar={() => setPedidoParaAgregar(null)}
            onAgregar={(platilloId, cant, nota) => agregarPlatillo(pedidoParaAgregar, platilloId, cant, nota)}
          />
        )}
      </Dialogo>

      <Dialogo
        abierto={dlgNuevaOrden}
        onCerrar={() => setDlgNuevaOrden(false)}
        titulo="Tomar nueva orden para mesa"
      >
        <DialogoNuevaOrden
          onCancelar={() => setDlgNuevaOrden(false)}
          onCrear={crearOrden}
        />
      </Dialogo>

      {toast}
    </>
  );
}

