'use strict';

/* =========================================================
   1. ESTADO GLOBAL
   ========================================================= */
const STORAGE_KEY = 'gestor_tareas_universitarias';

// Arreglo global: [{ id, titulo, curso, fechaEntrega, completada }]
let tareas = [];
let filtroActual = 'todas';

/* Referencias al DOM */
const form = document.getElementById('form-tarea');
const inputTitulo = document.getElementById('titulo');
const inputCurso = document.getElementById('curso');
const inputFecha = document.getElementById('fechaEntrega');
const divAlertas = document.getElementById('alertas');
const listaTareas = document.getElementById('lista-tareas');
const resumen = document.getElementById('resumen');
const botonesFiltro = document.querySelectorAll('.filtro');

/* =========================================================
   4. PERSISTENCIA (localStorage)
   ========================================================= */
function guardarTareas() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tareas));
  } catch (e) {
    mostrarAlertas(['No se pudo guardar en el almacenamiento local.']);
  }
}

function cargarTareas() {
  try {
    const datos = JSON.parse(localStorage.getItem(STORAGE_KEY));
    // Se conservan solo los objetos con la estructura esperada
    return Array.isArray(datos)
      ? datos.filter(t => t && t.id && t.titulo && t.curso && t.fechaEntrega)
      : [];
  } catch (e) {
    return [];
  }
}

/* =========================================================
   Utilidades de fecha
   ========================================================= */
// Convierte 'YYYY-MM-DD' a Date en hora local (evita desfase por zona horaria)
function parsearFecha(texto) {
  const [anio, mes, dia] = texto.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

function inicioDeHoy() {
  const ahora = new Date();
  return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
}

function formatearFecha(texto) {
  return parsearFecha(texto).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

/* =========================================================
   2. CAPTURA Y VALIDACIÓN
   ========================================================= */
function validarFormulario(titulo, curso, fecha) {
  const errores = [];
  const camposInvalidos = [];

  if (!titulo) { errores.push('El título es obligatorio.'); camposInvalidos.push(inputTitulo); }
  if (!curso)  { errores.push('El curso es obligatorio.'); camposInvalidos.push(inputCurso); }

  if (!fecha) {
    errores.push('La fecha de entrega es obligatoria.');
    camposInvalidos.push(inputFecha);
  } else if (parsearFecha(fecha) <= inicioDeHoy()) {
    errores.push('La fecha de entrega debe ser posterior a hoy.');
    camposInvalidos.push(inputFecha);
  }

  return { errores, camposInvalidos };
}

function mostrarAlertas(mensajes, tipo = 'error') {
  divAlertas.className = 'alertas' + (tipo === 'exito' ? ' exito' : '');
  divAlertas.textContent = '';

  const ul = document.createElement('ul');
  mensajes.forEach(msg => {
    const li = document.createElement('li');
    li.textContent = msg;
    ul.appendChild(li);
  });
  divAlertas.appendChild(ul);
}

function limpiarAlertas() {
  divAlertas.textContent = '';
  divAlertas.className = 'alertas';
  [inputTitulo, inputCurso, inputFecha].forEach(i => i.classList.remove('invalido'));
}

form.addEventListener('submit', (evento) => {
  evento.preventDefault(); // evita el refresco de la página
  limpiarAlertas();

  const titulo = inputTitulo.value.trim();
  const curso = inputCurso.value.trim();
  const fecha = inputFecha.value;

  const { errores, camposInvalidos } = validarFormulario(titulo, curso, fecha);

  if (errores.length > 0) {
    camposInvalidos.forEach(campo => campo.classList.add('invalido'));
    mostrarAlertas(errores);
    camposInvalidos[0].focus();
    return;
  }

  agregarTarea(titulo, curso, fecha);
  form.reset();
  mostrarAlertas(['Tarea agregada correctamente.'], 'exito');
});

/* =========================================================
   Operaciones sobre el arreglo (map, filter, find, reduce)
   ========================================================= */
function generarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function agregarTarea(titulo, curso, fechaEntrega) {
  const nueva = { id: generarId(), titulo, curso, fechaEntrega, completada: false };
  tareas = [...tareas, nueva];
  guardarTareas();
  renderizar();
}

function alternarTarea(id) {
  // map: devuelve un nuevo arreglo cambiando solo la tarea elegida
  tareas = tareas.map(t => t.id === id ? { ...t, completada: !t.completada } : t);
  guardarTareas();
  renderizar();
}

function eliminarTarea(id) {
  const tarea = tareas.find(t => t.id === id); // find
  if (!tarea) return;
  if (!confirm(`¿Eliminar la tarea "${tarea.titulo}"?`)) return;

  tareas = tareas.filter(t => t.id !== id); // filter
  guardarTareas();
  renderizar();
}

function obtenerTareasFiltradas() {
  switch (filtroActual) {
    case 'pendientes':  return tareas.filter(t => !t.completada);
    case 'completadas': return tareas.filter(t => t.completada);
    default:            return tareas;
  }
}

function contarPendientes() {
  // reduce: acumula las tareas sin completar
  return tareas.reduce((total, t) => total + (t.completada ? 0 : 1), 0);
}

/* =========================================================
   3. MANIPULACIÓN DINÁMICA DEL DOM
   ========================================================= */
function crearElementoTarea(tarea) {
  const li = document.createElement('li');
  li.className = 'tarea' + (tarea.completada ? ' completada' : '');
  li.dataset.id = tarea.id;

  const check = document.createElement('input');
  check.type = 'checkbox';
  check.className = 'tarea__check';
  check.checked = tarea.completada;
  check.setAttribute('aria-label', `Marcar "${tarea.titulo}" como completada`);

  const info = document.createElement('div');
  info.className = 'tarea__info';

  const titulo = document.createElement('div');
  titulo.className = 'tarea__titulo';
  titulo.textContent = tarea.titulo; // textContent evita inyección de HTML

  const meta = document.createElement('div');
  meta.className = 'tarea__meta';
  const vencida = !tarea.completada && parsearFecha(tarea.fechaEntrega) <= inicioDeHoy();
  meta.append(`${tarea.curso} · Entrega: ${formatearFecha(tarea.fechaEntrega)}`);
  if (vencida) {
    const aviso = document.createElement('span');
    aviso.className = 'vencida';
    aviso.textContent = ' (vencida)';
    meta.appendChild(aviso);
  }

  info.append(titulo, meta);

  const btnEliminar = document.createElement('button');
  btnEliminar.type = 'button';
  btnEliminar.className = 'tarea__eliminar';
  btnEliminar.textContent = 'Eliminar';
  btnEliminar.setAttribute('aria-label', `Eliminar "${tarea.titulo}"`);

  li.append(check, info, btnEliminar);
  return li;
}

function renderizar() {
  const visibles = obtenerTareasFiltradas();
  listaTareas.textContent = '';

  if (visibles.length === 0) {
    const vacio = document.createElement('li');
    vacio.className = 'vacio';
    vacio.textContent = tareas.length === 0
      ? 'Aún no hay tareas. Agrega la primera con el formulario.'
      : 'No hay tareas en esta vista.';
    listaTareas.appendChild(vacio);
  } else {
    const fragmento = document.createDocumentFragment();
    visibles.forEach(t => fragmento.appendChild(crearElementoTarea(t)));
    listaTareas.appendChild(fragmento);
  }

  const pendientes = contarPendientes();
  resumen.textContent = `${tareas.length} en total · ${pendientes} pendiente${pendientes === 1 ? '' : 's'}`;

  botonesFiltro.forEach(b => {
    const activo = b.dataset.filtro === filtroActual;
    b.classList.toggle('activo', activo);
    b.setAttribute('aria-pressed', activo);
  });
}

/* Delegación de eventos: un solo listener para toda la lista */
listaTareas.addEventListener('click', (e) => {
  const item = e.target.closest('.tarea');
  if (!item) return;
  const id = item.dataset.id;

  if (e.target.matches('.tarea__eliminar')) eliminarTarea(id);
});

listaTareas.addEventListener('change', (e) => {
  if (!e.target.matches('.tarea__check')) return;
  alternarTarea(e.target.closest('.tarea').dataset.id);
});

/* Filtros */
botonesFiltro.forEach(boton => {
  boton.addEventListener('click', () => {
    filtroActual = boton.dataset.filtro;
    renderizar();
  });
});

/* Limpia los errores en cuanto la persona corrige el campo */
[inputTitulo, inputCurso, inputFecha].forEach(input => {
  input.addEventListener('input', () => input.classList.remove('invalido'));
});

/* =========================================================
   Inicio: carga automática al terminar de cargar el DOM
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  tareas = cargarTareas();
  renderizar();
});