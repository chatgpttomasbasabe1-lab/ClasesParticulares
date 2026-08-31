import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Modal from '../../components/Modal';
import { DollarSign, Settings, Plus, Trash2, CreditCard, Banknote, ArrowRight, AlertCircle } from 'lucide-react';

export default function Facturacion() {
  const [tab, setTab] = useState('precios');
  const [nivelesAprendizaje, setNivelesAprendizaje] = useState([]);
  const [preciosConfig, setPreciosConfig] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [selectedAlumno, setSelectedAlumno] = useState(null);
  const [clasesDictadas, setClasesDictadas] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [senas, setSenas] = useState([]);
  const [deudas, setDeudas] = useState([]);
  const [modalPago, setModalPago] = useState(false);
  const [modalSena, setModalSena] = useState(false);
  const [claseParaPagar, setClaseParaPagar] = useState(null);
  const [splitPayments, setSplitPayments] = useState([{ monto: '', tipo_pago: 'EFECTIVO' }]);
  const [senaForm, setSenaForm] = useState({ alumno_id: '', monto: '' });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [{ data: na }, { data: precios }, { data: alums }] = await Promise.all([
      supabase.from('niveles_aprendizaje').select('*, materias(*), niveles_educativos(*)'),
      supabase.from('precios_config').select('*'),
      supabase.from('alumnos').select('*, niveles_aprendizaje(*, materias(*), niveles_educativos(*))').order('nombre')
    ]);
    setNivelesAprendizaje(na || []);
    setPreciosConfig(precios || []);
    setAlumnos(alums || []);
  }

  async function loadAlumnoData(alumnoId) {
    const [{ data: cls }, { data: pgs }, { data: sns }, { data: dds }] = await Promise.all([
      supabase.from('clases').select('*, niveles_aprendizaje(*, materias(*))').eq('alumno_id', alumnoId).eq('estado', 'DICTADA').order('fecha', { ascending: false }),
      supabase.from('pagos').select('*').eq('alumno_id', alumnoId).order('fecha', { ascending: false }),
      supabase.from('senas').select('*').eq('alumno_id', alumnoId).order('fecha', { ascending: false }),
      supabase.from('deudas').select('*').eq('alumno_id', alumnoId).order('fecha', { ascending: false })
    ]);
    setClasesDictadas(cls || []);
    setPagos(pgs || []);
    setSenas(sns || []);
    setDeudas(dds || []);
  }

  function selectAlumno(alumno) {
    setSelectedAlumno(alumno);
    loadAlumnoData(alumno.id);
  }

  // PRECIOS
  async function savePrecio(naId, precio) {
    const existing = preciosConfig.find(p => p.nivel_aprendizaje_id == naId);
    if (existing) {
      await supabase.from('precios_config').update({ precio_por_hora: precio }).eq('id', existing.id);
    } else {
      await supabase.from('precios_config').insert({ nivel_aprendizaje_id: naId, precio_por_hora: precio });
    }
    const { data } = await supabase.from('precios_config').select('*');
    setPreciosConfig(data || []);
  }

  // SPLIT PAYMENT
  function addSplitRow() {
    setSplitPayments(prev => [...prev, { monto: '', tipo_pago: 'EFECTIVO' }]);
  }

  function removeSplitRow(idx) {
    setSplitPayments(prev => prev.filter((_, i) => i !== idx));
  }

  function updateSplit(idx, field, val) {
    setSplitPayments(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s));
  }

  async function registrarPago() {
    if (!claseParaPagar) return;
    const hoy = new Date().toISOString().split('T')[0];
    let totalPagado = 0;

    // Check for señas disponibles
    const senasDisponibles = senas.filter(s => !s.aplicada);
    let montoSenas = senasDisponibles.reduce((sum, s) => sum + s.monto, 0);

    for (const sp of splitPayments) {
      if (!sp.monto || parseFloat(sp.monto) <= 0) continue;
      await supabase.from('pagos').insert({
        clase_id: claseParaPagar.id,
        alumno_id: selectedAlumno.id,
        monto: parseFloat(sp.monto),
        tipo_pago: sp.tipo_pago,
        fecha: hoy,
        descripcion: `Pago clase ${claseParaPagar.fecha}`
      });
      totalPagado += parseFloat(sp.monto);
    }

    // Apply señas
    totalPagado += montoSenas;
    for (const sena of senasDisponibles) {
      await supabase.from('senas').update({
        aplicada: true, clase_id_aplicada: claseParaPagar.id
      }).eq('id', sena.id);
    }

    // Check if debt needed
    const diferencia = claseParaPagar.costo_calculado - totalPagado;
    if (diferencia > 0) {
      await supabase.from('deudas').insert({
        alumno_id: selectedAlumno.id,
        clase_id: claseParaPagar.id,
        monto_original: diferencia,
        monto_pendiente: diferencia,
        fecha: hoy,
        estado: 'PENDIENTE'
      });
    }

    setModalPago(false);
    setSplitPayments([{ monto: '', tipo_pago: 'EFECTIVO' }]);
    loadAlumnoData(selectedAlumno.id);
  }

  // SEÑA
  async function registrarSena() {
    if (!senaForm.alumno_id || !senaForm.monto) return;
    await supabase.from('senas').insert({
      alumno_id: senaForm.alumno_id,
      monto: parseFloat(senaForm.monto),
      fecha: new Date().toISOString().split('T')[0],
      aplicada: false,
      clase_id_aplicada: null
    });
    setModalSena(false);
    if (selectedAlumno) loadAlumnoData(selectedAlumno.id);
  }

  const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
  const totalDeuda = deudas.filter(d => d.estado !== 'SALDADA').reduce((s, d) => s + d.monto_pendiente, 0);
  const totalSenas = senas.filter(s => !s.aplicada).reduce((s, se) => s + se.monto, 0);

  const splitTotal = splitPayments.reduce((s, sp) => s + (parseFloat(sp.monto) || 0), 0);

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Facturación y Cobranzas</h1>
        <p>Precios, pagos, señas y cuenta corriente de alumnos.</p>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'precios' ? 'active' : ''}`} onClick={() => setTab('precios')}>
          <Settings size={14} style={{ marginRight: 6 }} /> Precios
        </button>
        <button className={`tab ${tab === 'cuentas' ? 'active' : ''}`} onClick={() => setTab('cuentas')}>
          <DollarSign size={14} style={{ marginRight: 6 }} /> Cuentas Corrientes
        </button>
      </div>

      {tab === 'precios' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Precio por Hora según Nivel de Aprendizaje</h3>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Materia</th>
                  <th>Nivel Educativo</th>
                  <th>Precio/Hora ($)</th>
                </tr>
              </thead>
              <tbody>
                {nivelesAprendizaje.map(na => {
                  const precioActual = preciosConfig.find(p => p.nivel_aprendizaje_id === na.id);
                  return (
                    <tr key={na.id}>
                      <td style={{ fontWeight: 500 }}>{na.materias?.nombre}</td>
                      <td><span className="badge badge-purple">{na.niveles_educativos?.nombre}</span></td>
                      <td>
                        <input
                          className="form-input"
                          type="number"
                          style={{ width: 150 }}
                          placeholder="0"
                          defaultValue={precioActual?.precio_por_hora || ''}
                          onBlur={(e) => savePrecio(na.id, parseFloat(e.target.value) || 0)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'cuentas' && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
          {/* Lista de alumnos */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-primary)', fontWeight: 600 }}>
              Alumnos
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 12px' }}>
              <button className="btn btn-sm btn-secondary" style={{ width: '100%' }}
                onClick={() => { setSenaForm({ alumno_id: '', monto: '' }); setModalSena(true); }}>
                <Plus size={14} /> Registrar Seña
              </button>
            </div>
            {alumnos.map(a => (
              <div
                key={a.id}
                className={`chat-list-item ${selectedAlumno?.id === a.id ? 'active' : ''}`}
                onClick={() => selectAlumno(a)}
              >
                <div className="chat-avatar" style={{ width: 32, height: 32, fontSize: 11 }}>
                  {a.nombre?.[0]}{a.apellido?.[0]}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {a.nombre} {a.apellido}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {a.niveles_aprendizaje?.materias?.nombre}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Detalle cuenta corriente */}
          <div>
            {!selectedAlumno ? (
              <div className="card">
                <div className="empty-state">
                  <DollarSign size={48} />
                  <h3>Seleccioná un alumno</h3>
                  <p>Elegí un alumno de la lista para ver su cuenta corriente.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="account-header">
                  <div className="account-stat">
                    <div className="account-stat-value" style={{ color: 'var(--success)' }}>
                      ${totalPagado.toLocaleString('es-AR')}
                    </div>
                    <div className="account-stat-label">Total Pagado</div>
                  </div>
                  <div className="account-stat">
                    <div className="account-stat-value" style={{ color: 'var(--danger)' }}>
                      ${totalDeuda.toLocaleString('es-AR')}
                    </div>
                    <div className="account-stat-label">Deuda Pendiente</div>
                  </div>
                  <div className="account-stat">
                    <div className="account-stat-value" style={{ color: 'var(--info)' }}>
                      ${totalSenas.toLocaleString('es-AR')}
                    </div>
                    <div className="account-stat-label">Señas Disponibles</div>
                  </div>
                </div>

                {/* Clases dictadas */}
                <div className="card" style={{ marginBottom: 20 }}>
                  <div className="card-header">
                    <h3 className="card-title">Clases Dictadas</h3>
                  </div>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Materia</th>
                          <th>Duración</th>
                          <th>Costo</th>
                          <th>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clasesDictadas.map(c => (
                          <tr key={c.id}>
                            <td>{c.fecha}</td>
                            <td>{c.niveles_aprendizaje?.materias?.nombre}</td>
                            <td>{c.duracion_horas}h</td>
                            <td style={{ fontWeight: 600 }}>${c.costo_calculado?.toLocaleString('es-AR')}</td>
                            <td>
                              <button className="btn btn-sm btn-primary" onClick={() => {
                                setClaseParaPagar(c);
                                setSplitPayments([{ monto: '', tipo_pago: 'EFECTIVO' }]);
                                setModalPago(true);
                              }}>
                                <CreditCard size={14} /> Registrar Pago
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Deudas */}
                {deudas.filter(d => d.estado !== 'SALDADA').length > 0 && (
                  <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                    <div className="card-header">
                      <h3 className="card-title" style={{ color: 'var(--danger)' }}>
                        <AlertCircle size={18} style={{ marginRight: 8 }} /> Deudas Pendientes
                      </h3>
                    </div>
                    <div className="table-container">
                      <table>
                        <thead><tr><th>Fecha</th><th>Monto Original</th><th>Pendiente</th><th>Estado</th></tr></thead>
                        <tbody>
                          {deudas.filter(d => d.estado !== 'SALDADA').map(d => (
                            <tr key={d.id}>
                              <td>{d.fecha}</td>
                              <td>${d.monto_original?.toLocaleString('es-AR')}</td>
                              <td style={{ fontWeight: 600, color: 'var(--danger)' }}>${d.monto_pendiente?.toLocaleString('es-AR')}</td>
                              <td><span className="badge badge-danger">{d.estado}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Historial de Pagos */}
                <div className="card" style={{ marginTop: 20 }}>
                  <div className="card-header">
                    <h3 className="card-title">Historial de Pagos</h3>
                  </div>
                  <div className="table-container">
                    <table>
                      <thead><tr><th>Fecha</th><th>Monto</th><th>Medio</th><th>Descripción</th></tr></thead>
                      <tbody>
                        {pagos.map(p => (
                          <tr key={p.id}>
                            <td>{p.fecha}</td>
                            <td style={{ fontWeight: 600, color: 'var(--success)' }}>${p.monto?.toLocaleString('es-AR')}</td>
                            <td><span className="badge badge-info">{p.tipo_pago}</span></td>
                            <td style={{ color: 'var(--text-secondary)' }}>{p.descripcion}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal Split Payment */}
      <Modal
        isOpen={modalPago}
        onClose={() => setModalPago(false)}
        title="Registrar Pago"
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalPago(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={registrarPago}>Confirmar Pago</button>
          </>
        }
      >
        {claseParaPagar && (
          <>
            <div style={{ marginBottom: 20, padding: 16, background: 'var(--bg-glass)', borderRadius: 8, border: '1px solid var(--border-primary)' }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Costo de la clase</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>${claseParaPagar.costo_calculado?.toLocaleString('es-AR')}</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                {claseParaPagar.fecha} - {claseParaPagar.duracion_horas}h
              </div>
            </div>

            <div style={{ marginBottom: 16, fontWeight: 600, fontSize: 14 }}>Pagos (Split Payment)</div>
            {splitPayments.map((sp, idx) => (
              <div className="split-row" key={idx}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <input className="form-input" type="number" placeholder="Monto"
                    value={sp.monto} onChange={(e) => updateSplit(idx, 'monto', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <select className="form-select" value={sp.tipo_pago}
                    onChange={(e) => updateSplit(idx, 'tipo_pago', e.target.value)}>
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                    <option value="TARJETA">Tarjeta</option>
                  </select>
                </div>
                {splitPayments.length > 1 && (
                  <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)' }}
                    onClick={() => removeSplitRow(idx)}><Trash2 size={16} /></button>
                )}
              </div>
            ))}

            <button className="btn btn-sm btn-secondary" onClick={addSplitRow} style={{ marginTop: 8 }}>
              <Plus size={14} /> Agregar Medio de Pago
            </button>

            <div className="split-total">
              <span>Total a Pagar</span>
              <span style={{ color: splitTotal >= claseParaPagar.costo_calculado ? 'var(--success)' : 'var(--warning)' }}>
                ${splitTotal.toLocaleString('es-AR')}
                {splitTotal < claseParaPagar.costo_calculado && (
                  <span style={{ fontSize: 12, marginLeft: 8, color: 'var(--danger)' }}>
                    (Deuda: ${(claseParaPagar.costo_calculado - splitTotal).toLocaleString('es-AR')})
                  </span>
                )}
              </span>
            </div>
          </>
        )}
      </Modal>

      {/* Modal Seña */}
      <Modal
        isOpen={modalSena}
        onClose={() => setModalSena(false)}
        title="Registrar Seña"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalSena(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={registrarSena}>Registrar</button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Alumno</label>
          <select className="form-select" value={senaForm.alumno_id}
            onChange={(e) => setSenaForm({ ...senaForm, alumno_id: e.target.value })}>
            <option value="">Seleccionar alumno...</option>
            {alumnos.map(a => (
              <option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Monto de la Seña ($)</label>
          <input className="form-input" type="number" placeholder="0" value={senaForm.monto}
            onChange={(e) => setSenaForm({ ...senaForm, monto: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
