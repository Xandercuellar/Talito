import { useCallback, useEffect, useState } from 'react';
import { api, dinero, reducirImagen } from '../api.js';
import Dialogo from '../components/Dialogo.jsx';

const VACIO = { id: null, nombre: '', categoriaId: '', precio: '', desc: '', disponible: true, foto: null };

function ModalCategorias({ abierto, onCerrar, onActualizado }) {
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [msgOk, setMsgOk] = useState('');

  // Crear
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [creando, setCreando] = useState(false);

  // Editar
  const [editandoId, setEditandoId] = useState(null);
  const [editNombre, setEditNombre] = useState('');
  const [guardandoId, setGuardandoId] = useState(null);

  // Eliminar
  const [confirmandoId, setConfirmandoId] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      const cats = await api('/admin/categorias');
      setCategorias(cats);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (abierto) {
      setError('');
      setMsgOk('');
      setNuevoNombre('');
      setEditandoId(null);
      setConfirmandoId(null);
      cargar();
    }
  }, [abierto, cargar]);

  async function crear(e) {
    e.preventDefault();
    if (!nuevoNombre.trim() || creando) return;
    setError('');
    setMsgOk('');
    setCreando(true);
    try {
      await api('/admin/categorias', { method: 'POST', body: { nombre: nuevoNombre.trim() } });
      setNuevoNombre('');
      setMsgOk('Categoría creada exitosamente.');
      await cargar();
      onActualizado();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreando(false);
    }
  }

  async function guardarEdicion(id) {
    if (!editNombre.trim() || guardandoId) return;
    setError('');
    setMsgOk('');
    setGuardandoId(id);
    try {
      await api(`/admin/categorias/${id}`, { method: 'PUT', body: { nombre: editNombre.trim() } });
      setEditandoId(null);
      setMsgOk('Categoría actualizada.');
      await cargar();
      onActualizado();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardandoId(null);
    }
  }

  async function eliminar(cat) {
    setError('');
    setMsgOk('');
    setEliminandoId(cat.id);
    try {
      await api(`/admin/categorias/${cat.id}`, { method: 'DELETE' });
      setConfirmandoId(null);
      setMsgOk(`Categoría «${cat.nombre}» eliminada.`);
      await cargar();
      onActualizado();
    } catch (err) {
      setError(err.message);
    } finally {
      setEliminandoId(null);
    }
  }

  return (
    <Dialogo abierto={abierto} onCerrar={onCerrar} titulo="Categorías del Menú">
      <div style={{ minWidth: 'min(100%, 500px)', maxWidth: '100%' }}>
        {error && <div className="error-msg" role="alert" style={{ marginBottom: 12 }}>{error}</div>}
        {msgOk && <p className="badge ok msg-ok" role="status" style={{ marginBottom: 12, display: 'block' }}>{msgOk}</p>}

        {/* Crear nueva categoría */}
        <form onSubmit={crear} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            type="text"
            maxLength={60}
            required
            placeholder="Nueva categoría (ej. Bebidas, Postres)…"
            value={nuevoNombre}
            disabled={creando}
            onChange={(e) => setNuevoNombre(e.target.value)}
            style={{ flex: 1, minHeight: '38px', padding: '0 12px', border: '1px solid var(--line)', borderRadius: '6px' }}
          />
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={creando || !nuevoNombre.trim()}
            style={{ whiteSpace: 'nowrap' }}
          >
            {creando ? 'Creando…' : '+ Agregar'}
          </button>
        </form>

        {/* Lista de categorías */}
        <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid var(--line)', borderRadius: '8px', padding: '6px', background: '#fafafa' }}>
          {cargando && categorias.length === 0 ? (
            <p className="cargando" style={{ padding: '20px 0' }}>Cargando categorías…</p>
          ) : categorias.length === 0 ? (
            <p className="vacio" style={{ padding: '20px 0' }}>No hay categorías registradas.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {categorias.map((c) => {
                const esEditando = editandoId === c.id;
                const esConfirmando = confirmandoId === c.id;
                const count = c.platillos_count ?? 0;

                if (esEditando) {
                  return (
                    <li key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#fff', border: '1px solid var(--line)', borderRadius: 6, padding: '8px 10px' }}>
                      <input
                        type="text"
                        maxLength={60}
                        required
                        autoFocus
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                        style={{ flex: 1, minHeight: '34px', padding: '0 8px', border: '1px solid var(--line)', borderRadius: 4 }}
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={guardandoId === c.id || !editNombre.trim()}
                        onClick={() => guardarEdicion(c.id)}
                      >
                        {guardandoId === c.id ? 'Guardando…' : 'Guardar'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        disabled={guardandoId === c.id}
                        onClick={() => setEditandoId(null)}
                      >
                        Cancelar
                      </button>
                    </li>
                  );
                }

                return (
                  <li key={c.id} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 6, padding: '8px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                        <strong style={{ fontSize: '0.98rem', color: 'var(--ink)' }}>{c.nombre}</strong>
                        <span style={{ fontSize: '0.78rem', color: count > 0 ? 'var(--muted)' : '#b45309', background: count > 0 ? '#f1f5f9' : '#fef3c7', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                          {count} {count === 1 ? 'platillo' : 'platillos'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          style={{ padding: '0 10px', minHeight: '30px', fontSize: '0.82rem' }}
                          onClick={() => {
                            setEditandoId(c.id);
                            setEditNombre(c.nombre);
                            setConfirmandoId(null);
                            setError('');
                          }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-peligro"
                          style={{ padding: '0 10px', minHeight: '30px', fontSize: '0.82rem' }}
                          onClick={() => {
                            setConfirmandoId(esConfirmando ? null : c.id);
                            setEditandoId(null);
                            setError('');
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>

                    {esConfirmando && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--line)' }}>
                        {count > 0 ? (
                          <div>
                            <p style={{ margin: '0 0 6px 0', fontSize: '0.84rem', color: 'var(--chile)', fontWeight: 600 }}>
                              ⚠ Esta categoría contiene {count} platillo(s). Mueve o elimina sus platillos antes de poder borrarla.
                            </p>
                            <button
                              type="button"
                              className="btn btn-sm btn-ghost"
                              style={{ minHeight: '26px', fontSize: '0.78rem' }}
                              onClick={() => setConfirmandoId(null)}
                            >
                              Entendido
                            </button>
                          </div>
                        ) : (
                          <div>
                            <p style={{ margin: '0 0 6px 0', fontSize: '0.86rem', color: 'var(--ink)' }}>
                              ¿Confirmas eliminar la categoría <strong>«{c.nombre}»</strong>?
                            </p>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                type="button"
                                className="btn btn-sm btn-peligro"
                                style={{ minHeight: '30px', padding: '0 12px' }}
                                disabled={eliminandoId === c.id}
                                onClick={() => eliminar(c)}
                              >
                                {eliminandoId === c.id ? 'Eliminando…' : 'Sí, eliminar'}
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-ghost"
                                style={{ minHeight: '30px', padding: '0 12px' }}
                                disabled={eliminandoId === c.id}
                                onClick={() => setConfirmandoId(null)}
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="dlg-acciones" style={{ marginTop: 14 }}>
          <button type="button" className="btn btn-ghost" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
      </div>
    </Dialogo>
  );
}

function FormPlatillo({ inicial, categorias, onGuardado, onEliminado, onCancelar }) {
  const [f, setF] = useState({ ...inicial, categoriaId: inicial.categoriaId || categorias[0]?.id || '' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [fotoNueva, setFotoNueva] = useState(null); // data URL reducida, aún sin subir
  const [quitarFoto, setQuitarFoto] = useState(false);
  const [confirmando, setConfirmando] = useState(false); // paso de confirmación para eliminar
  const vista = fotoNueva ?? (quitarFoto ? null : inicial.foto);
  const cambiar = (campo) => (e) => setF((x) => ({ ...x, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function elegirFoto(e) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    try {
      setFotoNueva(await reducirImagen(archivo));
      setQuitarFoto(false);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function eliminar() {
    setError('');
    setEnviando(true);
    try {
      await api(`/admin/platillos/${f.id}`, { method: 'DELETE' });
      onEliminado(`«${inicial.nombre}» se eliminó del menú.`);
    } catch (err) {
      setError(err.message);
      setEnviando(false);
      setConfirmando(false);
    }
  }

  async function enviar(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    const body = { nombre: f.nombre, categoriaId: Number(f.categoriaId), precio: f.precio, desc: f.desc, disponible: f.disponible };
    try {
      let id = f.id;
      if (id) await api(`/admin/platillos/${id}`, { method: 'PUT', body });
      else id = (await api('/admin/platillos', { method: 'POST', body })).id;

      try {
        if (fotoNueva) await api(`/admin/platillos/${id}/foto`, { method: 'PUT', body: { imagen: fotoNueva } });
        else if (quitarFoto && inicial.foto) await api(`/admin/platillos/${id}/foto`, { method: 'DELETE' });
      } catch (errFoto) {
        // El platillo ya quedó guardado: solo avisamos que la foto falló.
        onGuardado(`Platillo guardado, pero la foto no se pudo subir: ${errFoto.message}`);
        return;
      }
      onGuardado(f.id ? 'Platillo actualizado.' : 'Platillo creado.');
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar}>
      {error && <div className="error-msg" role="alert">{error}</div>}
      <div className="campo">
        <span className="etiqueta">Foto del platillo</span>
        <div className="foto-edit">
          <div className="foto-prev">
            {vista ? <img src={vista} alt="Vista previa de la foto" /> : <span className="sin-foto" aria-hidden="true">{(f.nombre || '?').charAt(0)}</span>}
          </div>
          <div className="foto-acciones">
            <label className="btn btn-sm btn-ghost foto-subir">
              {vista ? 'Cambiar foto' : 'Subir foto'}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={elegirFoto} />
            </label>
            {vista && (
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setFotoNueva(null); setQuitarFoto(true); }}>Quitar foto</button>
            )}
            <small>JPG, PNG o WebP. Se reduce automáticamente.</small>
          </div>
        </div>
      </div>
      <div className="campo">
        <label htmlFor="p-nombre">Nombre</label>
        <input id="p-nombre" type="text" maxLength={100} required value={f.nombre} onChange={cambiar('nombre')} />
      </div>
      <div className="fila-2">
        <div className="campo">
          <label htmlFor="p-cat">Categoría</label>
          <select id="p-cat" required value={f.categoriaId} onChange={cambiar('categoriaId')}>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="p-precio">Precio (USD)</label>
          <input id="p-precio" type="number" step="0.01" min={0} max={999} required value={f.precio} onChange={cambiar('precio')} />
        </div>
      </div>
      <div className="campo">
        <label htmlFor="p-desc">Descripción</label>
        <textarea id="p-desc" rows={3} maxLength={255} value={f.desc} onChange={cambiar('desc')} />
      </div>
      <label className="check">
        <input type="checkbox" checked={f.disponible} onChange={cambiar('disponible')} /> Disponible para pedir
      </label>
      {f.id && (
        <div className="zona-eliminar">
          {!confirmando ? (
            <button type="button" className="btn btn-sm btn-peligro" disabled={enviando} onClick={() => setConfirmando(true)}>Eliminar platillo</button>
          ) : (
            <>
              <p>¿Eliminar «{inicial.nombre}» del menú? No se puede deshacer. Si solo se acabó por hoy, mejor desmarca «Disponible para pedir».</p>
              <div className="dlg-acciones">
                <button type="button" className="btn btn-sm btn-ghost" disabled={enviando} onClick={() => setConfirmando(false)}>No, conservar</button>
                <button type="button" className="btn btn-sm btn-peligro" disabled={enviando} onClick={eliminar}>Sí, eliminar</button>
              </div>
            </>
          )}
        </div>
      )}
      <div className="dlg-acciones">
        <button type="button" className="btn btn-ghost" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </form>
  );
}

export default function MenuAdmin() {
  const [platillos, setPlatillos] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [editando, setEditando] = useState(null); // null = cerrado
  const [verCategorias, setVerCategorias] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([api('/admin/platillos'), api('/admin/categorias')]);
      setPlatillos(p);
      setCategorias(c);
    } catch (e) {
      setError(e.message);
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  if (error) return <div className="error-msg" role="alert">{error}</div>;
  if (!platillos) return <p className="cargando">Cargando menú…</p>;

  return (
    <>
      <div className="ad-cab">
        <div>
          <h1>Menú</h1>
          <p>{platillos.length} platillos registrados.</p>
        </div>
        <div className="ad-acciones">
          <button type="button" className="btn btn-ghost" onClick={() => { setOk(''); setVerCategorias(true); }}>
            Ver categorías
          </button>
          <button type="button" className="btn btn-primary" onClick={() => { setOk(''); setEditando(VACIO); }}>
            Nuevo platillo
          </button>
        </div>
      </div>

      {ok && <p className="badge ok msg-ok" role="status">{ok}</p>}

      <ul className="ad-platos">
        {platillos.map((p) => (
          <li key={p.id} className={`ad-plato${p.disponible ? '' : ' no-disponible'}`}>
            <div className="plato-foto">
              {p.foto
                ? <img src={p.foto} alt={p.nombre} loading="lazy" decoding="async" />
                : <span className="sin-foto" aria-hidden="true">{p.nombre.charAt(0)}</span>}
              <span className={`badge ${p.disponible ? 'ok' : 'off'} plato-estado`}>{p.disponible ? 'Disponible' : 'No disponible'}</span>
            </div>
            <div className="plato-cuerpo">
              <span className="plato-cat">{p.categoria}</span>
              <h3>{p.nombre}</h3>
              <p>{p.desc}</p>
              <div className="plato-der">
                <span className="precio">{dinero(p.precio)}</span>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setOk(''); setEditando(p); }}>Editar</button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <ModalCategorias
        abierto={verCategorias}
        onCerrar={() => setVerCategorias(false)}
        onActualizado={cargar}
      />

      <Dialogo abierto={editando !== null} onCerrar={() => setEditando(null)} titulo={editando?.id ? 'Editar platillo' : 'Nuevo platillo'}>
        {editando && (
          <FormPlatillo
            inicial={editando}
            categorias={categorias}
            onCancelar={() => setEditando(null)}
            onGuardado={(msg) => { setEditando(null); setOk(msg); cargar(); }}
            onEliminado={(msg) => { setEditando(null); setOk(msg); cargar(); }}
          />
        )}
      </Dialogo>
    </>
  );
}
