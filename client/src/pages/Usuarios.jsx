import { useCallback, useEffect, useMemo, useState } from 'react';
import { ETIQUETA_ROL, api, fecha } from '../api.js';
import { useAuth } from '../auth.jsx';
import Dialogo from '../components/Dialogo.jsx';

export default function Usuarios() {
  const { usuario: usuarioActual } = useAuth();
  const [lista, setLista] = useState(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('');

  // Estado para creación
  const [f, setF] = useState({ nombre: '', correo: '', clave: '', rol: 'mesero' });
  const [enviando, setEnviando] = useState(false);

  // Estado para edición
  const [editando, setEditando] = useState(null); // usuario seleccionado
  const [formEdit, setFormEdit] = useState({ nombre: '', correo: '', rol: 'mesero', clave: '' });
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  const [errorEdit, setErrorEdit] = useState('');

  // Estado para eliminación
  const [eliminando, setEliminando] = useState(null);
  const [borrando, setBorrando] = useState(false);
  const [errorDelete, setErrorDelete] = useState('');

  const cambiar = (campo) => (e) => setF((x) => ({ ...x, [campo]: e.target.value }));
  const cambiarEdit = (campo) => (e) => setFormEdit((x) => ({ ...x, [campo]: e.target.value }));

  const cargar = useCallback(() => {
    api('/admin/usuarios').then(setLista).catch((e) => setError(e.message));
  }, []);
  useEffect(cargar, [cargar]);

  async function crear(e) {
    e.preventDefault();
    setError('');
    setOk('');
    setEnviando(true);
    try {
      await api('/admin/usuarios', { method: 'POST', body: f });
      setF({ nombre: '', correo: '', clave: '', rol: 'mesero' });
      setOk('Cuenta creada exitosamente.');
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  function iniciarEdicion(u) {
    setEditando(u);
    setFormEdit({
      nombre: u.nombre,
      correo: u.correo,
      rol: u.rol,
      clave: '',
    });
    setErrorEdit('');
  }

  async function guardarEdicion(e) {
    e.preventDefault();
    setErrorEdit('');
    setGuardandoEdit(true);
    try {
      const payload = {
        nombre: formEdit.nombre.trim(),
        correo: formEdit.correo.trim(),
        rol: formEdit.rol,
      };
      if (formEdit.clave.trim()) {
        payload.clave = formEdit.clave.trim();
      }
      await api(`/admin/usuarios/${editando.id}`, {
        method: 'PUT',
        body: payload,
      });
      setEditando(null);
      setOk(`Usuario «${formEdit.nombre}» actualizado correctamente.`);
      cargar();
    } catch (err) {
      setErrorEdit(err.message);
    } finally {
      setGuardandoEdit(false);
    }
  }

  async function confirmarEliminacion() {
    if (!eliminando) return;
    setErrorDelete('');
    setBorrando(true);
    try {
      await api(`/admin/usuarios/${eliminando.id}`, { method: 'DELETE' });
      const nom = eliminando.nombre;
      setEliminando(null);
      setOk(`Usuario «${nom}» eliminado.`);
      cargar();
    } catch (err) {
      setErrorDelete(err.message);
    } finally {
      setBorrando(false);
    }
  }

  const usuariosFiltrados = useMemo(() => {
    if (!lista) return [];
    return lista.filter((u) => {
      const coincideTexto = !busqueda ||
        u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        u.correo.toLowerCase().includes(busqueda.toLowerCase());
      const coincideRol = !filtroRol || u.rol === filtroRol;
      return coincideTexto && coincideRol;
    });
  }, [lista, busqueda, filtroRol]);

  return (
    <>
      <div className="ad-cab">
        <div>
          <h1>Usuarios y roles</h1>
          <p style={{ color: 'var(--muted)', margin: '4px 0 0' }}>
            Gestiona los accesos del restaurante: Administradores, Caja, Cocina y Meseros.
          </p>
        </div>
      </div>

      {ok && <p className="badge ok msg-ok" role="status">{ok}</p>}
      {error && <div className="error-msg" role="alert">{error}</div>}

      <div className="grid-usuarios">
        <div className="panel tabla-scroll">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Cuentas registradas ({usuariosFiltrados.length})</h2>
          </div>

          <div className="filtro-barra" style={{ marginBottom: 12 }}>
            <input
              type="text"
              placeholder="Buscar por nombre o correo…"
              style={{ flex: 1, minWidth: '180px' }}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <select value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)}>
              <option value="">Todos los roles</option>
              <option value="admin">Administrador</option>
              <option value="mesero">Mesero</option>
              <option value="caja">Caja</option>
              <option value="cocina">Cocina</option>
            </select>
            {(busqueda || filtroRol) && (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => { setBusqueda(''); setFiltroRol(''); }}
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {!lista ? (
            <p className="cargando">Cargando usuarios…</p>
          ) : usuariosFiltrados.length === 0 ? (
            <p className="vacio">No se encontraron usuarios.</p>
          ) : (
            <table className="tabla">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Alta</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((u) => {
                  const esPropio = usuarioActual?.correo === u.correo;
                  return (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.nombre}</strong>
                        {esPropio && <small style={{ marginLeft: 6, color: 'var(--hoja)', fontWeight: 700 }}>(Tú)</small>}
                      </td>
                      <td>{u.correo}</td>
                      <td>
                        <span className={`badge rol-${u.rol}`}>
                          {ETIQUETA_ROL[u.rol] ?? u.rol}
                        </span>
                      </td>
                      <td>{fecha(u.creadoEn)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            onClick={() => iniciarEdicion(u)}
                            title="Editar usuario"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-peligro"
                            onClick={() => { setEliminando(u); setErrorDelete(''); }}
                            disabled={esPropio}
                            title={esPropio ? 'No puedes eliminar tu propia cuenta en uso' : 'Eliminar usuario'}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Panel para Crear Usuario */}
        <form className="panel" onSubmit={crear}>
          <h2>Crear nueva cuenta</h2>
          <div className="campo">
            <label htmlFor="u-nombre">Nombre completo</label>
            <input
              id="u-nombre"
              type="text"
              maxLength={80}
              required
              placeholder="Ej. Juan Pérez"
              value={f.nombre}
              onChange={cambiar('nombre')}
            />
          </div>

          <div className="campo">
            <label htmlFor="u-rol">Rol en el sistema</label>
            <select id="u-rol" required value={f.rol} onChange={cambiar('rol')}>
              <option value="mesero">Mesero (Atención y pedidos en mesa)</option>
              <option value="caja">Caja (Cobro y recepción)</option>
              <option value="cocina">Cocina (Preparación de comandas)</option>
              <option value="admin">Administrador (Control total)</option>
            </select>
          </div>

          <div className="campo">
            <label htmlFor="u-correo">Correo electrónico</label>
            <input
              id="u-correo"
              type="email"
              required
              placeholder="mesero@talito.com"
              value={f.correo}
              onChange={cambiar('correo')}
            />
          </div>

          <div className="campo">
            <label htmlFor="u-clave">Contraseña</label>
            <input
              id="u-clave"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
              value={f.clave}
              onChange={cambiar('clave')}
            />
            <small>Mínimo 8 caracteres.</small>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={enviando}>
            {enviando ? 'Creando…' : 'Crear cuenta'}
          </button>
        </form>
      </div>

      {/* Modal para Editar Usuario */}
      <Dialogo
        abierto={Boolean(editando)}
        onCerrar={() => setEditando(null)}
        titulo={`Editar cuenta: ${editando?.nombre}`}
      >
        {editando && (
          <form onSubmit={guardarEdicion}>
            {errorEdit && <div className="error-msg" role="alert" style={{ marginBottom: 12 }}>{errorEdit}</div>}

            <div className="campo">
              <label htmlFor="edit-nombre">Nombre completo</label>
              <input
                id="edit-nombre"
                type="text"
                maxLength={80}
                required
                value={formEdit.nombre}
                onChange={cambiarEdit('nombre')}
              />
            </div>

            <div className="campo">
              <label htmlFor="edit-rol">Rol</label>
              <select id="edit-rol" required value={formEdit.rol} onChange={cambiarEdit('rol')}>
                <option value="mesero">Mesero</option>
                <option value="caja">Caja</option>
                <option value="cocina">Cocina</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div className="campo">
              <label htmlFor="edit-correo">Correo electrónico</label>
              <input
                id="edit-correo"
                type="email"
                required
                value={formEdit.correo}
                onChange={cambiarEdit('correo')}
              />
            </div>

            <div className="campo">
              <label htmlFor="edit-clave">Nueva contraseña (opcional)</label>
              <input
                id="edit-clave"
                type="password"
                minLength={8}
                autoComplete="new-password"
                placeholder="Dejar en blanco para conservar la actual"
                value={formEdit.clave}
                onChange={cambiarEdit('clave')}
              />
              <small>Solo escribe si deseas cambiar la contraseña del usuario.</small>
            </div>

            <div className="dlg-acciones">
              <button type="button" className="btn btn-ghost" onClick={() => setEditando(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={guardandoEdit}>
                {guardandoEdit ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        )}
      </Dialogo>

      {/* Modal para Confirmar Eliminación */}
      <Dialogo
        abierto={Boolean(eliminando)}
        onCerrar={() => setEliminando(null)}
        titulo="Confirmar eliminación de usuario"
      >
        {eliminando && (
          <div>
            {errorDelete && <div className="error-msg" role="alert" style={{ marginBottom: 12 }}>{errorDelete}</div>}

            <p style={{ margin: '0 0 16px' }}>
              ¿Estás seguro de que deseas eliminar permanentemente la cuenta de{' '}
              <strong>{eliminando.nombre}</strong> ({eliminando.correo}) con rol{' '}
              <strong>{ETIQUETA_ROL[eliminando.rol]}</strong>?
            </p>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: 20 }}>
              Esta acción no se puede deshacer. Las órdenes históricas mantendrán el registro de ventas pero la cuenta dejará de tener acceso al sistema.
            </p>

            <div className="dlg-acciones">
              <button type="button" className="btn btn-ghost" onClick={() => setEliminando(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary btn-peligro"
                disabled={borrando}
                onClick={confirmarEliminacion}
              >
                {borrando ? 'Eliminando…' : 'Sí, eliminar cuenta'}
              </button>
            </div>
          </div>
        )}
      </Dialogo>
    </>
  );
}
