// ============================================================
//  reportesqrvirtual.js
//  Módulo de reportes QR
// ============================================================

// ---------- CONFIGURACIÓN ----------
const API_URL = window.BACKEND_HOST || 'http://localhost:3000';


const originalFetch = window.fetch;

// Coloca aquí tu clave (¡Recuerda que debe coincidir con la del backend!)
const API_KEY_SECRETA = "sk_live_wP7hgt9l0gvgcmi4Rj9pOqMyyPfiB1wI"; 

window.fetch = async (url, options = {}) => {
  // 1. Timeout configurable (default: 60 segundos)
  const timeout = options.timeout || 60000; 
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // 2. Headers personalizados (incluyendo el de MQTT y el de la API Key)
  const newOptions = {
    ...options,
    headers: {
      ...options.headers,
      'x-mqtt-topic': 'reportesqrvistual', // <- Tu header personalizado de siempre
      'x-api-key': API_KEY_SECRETA     // 👈 AQUÍ metes el nuevo candado
    },
    signal: controller.signal // <- Signal para el timeout
  };

  try {
    const response = await originalFetch(url, newOptions);
    clearTimeout(timeoutId); // Limpiar timeout si todo sale bien
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error(`⚠️ Fetch timeout después de ${timeout}ms (URL: ${url})`);
      throw new Error(`El servidor no respondió en ${timeout / 1000} segundos`);
    }
    throw error; // Otros errores (CORS, red, etc.)
  }
};

// ---------- ESTADO ----------
let idPostgres = null;
let idKnovo = null;
let reportes = [];
let totalReportes = 0;
let paginaActual = 0;
const LIMIT = 50;

// ---------- DOM REFS ----------
const condoNameSpan = document.getElementById('condoName');
const filtroTipo = document.getElementById('filtroTipo');
const filtroDesde = document.getElementById('filtroDesde');
const filtroHasta = document.getElementById('filtroHasta');
const btnAplicar = document.getElementById('btnAplicarFiltros');
const btnLimpiar = document.getElementById('btnLimpiarFiltros');
const btnExportar = document.getElementById('btnExportar');
const resumenGrid = document.getElementById('resumenGrid');
const tablaBody = document.getElementById('tablaBody');
const totalReportesSpan = document.getElementById('totalReportes');
const pagInfo = document.getElementById('pagInfo');
const btnPrev = document.getElementById('btnPrev');
const btnNext = document.getElementById('btnNext');
const buscadorTabla = document.getElementById('buscadorTabla');
const buscadorClear = document.getElementById('buscadorClear');

// ============================================================
//  INFO CONDOMINIO
// ============================================================
function cargarInfoCondominio() {
    const data = sessionStorage.getItem('condominioSeleccionado');
    if (!data) {
        condoNameSpan.textContent = '🏷️ No seleccionado';
        return false;
    }
    try {
        const condo = JSON.parse(data);
        idPostgres = condo.id;
        condoNameSpan.textContent = `🏷️ ${condo.name || 'Sin nombre'}`;
        return true;
    } catch (e) {
        condoNameSpan.textContent = '🏷️ Error';
        return false;
    }
}

// ============================================================
//  OBTENER idKnovo
// ============================================================
async function obtenerIdKnovo() {
    const res = await fetch(`${API_URL}/api/knovo/${idPostgres}/idknovo`);
    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error || 'No se pudo obtener el idKnovo');
    }

    return data.idKnovo;
}

// ============================================================
//  FORMATEAR FECHA
// ============================================================
function formatearFecha(fechaISO) {
    if (!fechaISO) return '-';
    try {
        const fecha = new Date(fechaISO);
        const opciones = {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return fecha.toLocaleDateString('es-MX', opciones);
    } catch {
        return '-';
    }
}

// ============================================================
//  HELPERS
// ============================================================
function getTipoEmoji(tipo) {
    return { valido: '✅', invalido: '❌', basura: '🗑️' }[tipo] || '❓';
}

function getTipoTexto(tipo) {
    return { valido: 'Válido', invalido: 'Inválido', basura: 'Basura' }[tipo] || tipo;
}

function getTipoQREmoji(tipoQR) {
    if (!tipoQR) return '';
    const mapa = {
        'invitado': '🎟️',
        'peaton': '🚶',
        'Hospedaje': '🏨',
        'Evento': '🎉'
    };
    return mapa[tipoQR] || '📌';
}

function getTipoQRClass(tipoQR) {
    if (!tipoQR) return '';
    const mapa = {
        'invitado': 'invitado',
        'peaton': 'peaton',
        'Hospedaje': 'hospedaje',
        'Evento': 'evento'
    };
    return mapa[tipoQR] || '';
}

// 🔥 Valor seguro: devuelve el valor o un guion
function safe(valor) {
    if (valor === null || valor === undefined || valor === '') return null;
    return String(valor);
}

// ============================================================
//  CARGAR REPORTES
// ============================================================
async function cargarReportes() {
    if (!idKnovo) return;

    // 🔍 Resetear buscador
    buscadorTabla.value = '';
    buscadorClear.classList.remove('visible');

    // Skeleton
    tablaBody.innerHTML = `
        <tr><td colspan="9"><div class="skeleton-row"></div></td></tr>
        <tr><td colspan="9"><div class="skeleton-row"></div></td></tr>
        <tr><td colspan="9"><div class="skeleton-row"></div></td></tr>
    `;

    try {
        const params = new URLSearchParams();

        if (filtroTipo.value) params.append('tipo', filtroTipo.value);
        if (filtroDesde.value) params.append('desde', filtroDesde.value);
        if (filtroHasta.value) params.append('hasta', filtroHasta.value);

        params.append('limit', LIMIT);
        params.append('skip', paginaActual * LIMIT);

        const url = `${API_URL}/api/knovo/reportes/${idKnovo}?${params.toString()}`;
        //console.log('📡 Fetch:', url);

        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Error al cargar reportes');
        }

        reportes = data.reportes || [];
        totalReportes = data.total || 0;

        renderTabla();
        renderPaginacion();
        actualizarTotal();

    } catch (error) {
        console.error('❌ Error cargando reportes:', error);
        tablaBody.innerHTML = `
            <tr>
                <td colspan="9" class="tabla-vacia">
                    <span class="emoji">❌</span>
                    Error al cargar los reportes: ${error.message}
                </td>
            </tr>
        `;
    }
}

// ============================================================
//  RENDER TABLA
// ============================================================
function renderTabla() {
    if (reportes.length === 0) {
        tablaBody.innerHTML = `
            <tr>
                <td colspan="9" class="tabla-vacia">
                    <span class="emoji">📭</span>
                    No hay reportes con estos filtros
                </td>
            </tr>
        `;
        return;
    }

    const html = reportes.map(r => {
        // ---------- Tipo ----------
        const tipoEmoji = getTipoEmoji(r.tipo);
        const tipoTexto = getTipoTexto(r.tipo);

        // ---------- Residente (de Mongo) ----------
        const nombreResidente = safe(r.nombreResidente);

        // ---------- Invitado (del QR) ----------
        const nombreInvitado = safe(r.nombre);

        // ---------- Casa ----------
        const nombreCasa = safe(r.nombreCasa);

        // ---------- Placa ----------
        const placa = safe(r.placa);

        // ---------- Tipo QR ----------
        const tipoQR = safe(r.tipoQR);

        // ---------- E/S ----------
        const esEmoji = r.entradaSalida === 'entrada' ? '⬅️' : '➡️';
        const esTexto = r.entradaSalida === 'entrada' ? 'Entrada' : 'Salida';

        // ---------- Motivo ----------
        const motivo = safe(r.motivo);

        return `
            <tr>
                <td>${formatearFecha(r.timestamp)}</td>
                <td>
                    <span class="badge-tipo ${r.tipo}">
                        ${tipoEmoji} ${tipoTexto}
                    </span>
                </td>
                <td>
                    ${nombreResidente 
                        ? `<span class="celda-residente">${nombreResidente}</span>` 
                        : `<span class="celda-vacia">—</span>`}
                </td>
                <td>
                    ${nombreInvitado 
                        ? `<span class="celda-invitado">${nombreInvitado}</span>` 
                        : `<span class="celda-vacia">—</span>`}
                </td>
                <td>
                    ${nombreCasa 
                        ? `<span class="celda-casa">🏠 ${nombreCasa}</span>` 
                        : `<span class="celda-vacia">—</span>`}
                </td>
                <td>
                    ${placa 
                        ? `<span class="celda-placa">${placa}</span>` 
                        : `<span class="celda-vacia">—</span>`}
                </td>
                <td>
                    ${tipoQR 
                        ? `<span class="tipoqr-badge ${getTipoQRClass(tipoQR)}">${getTipoQREmoji(tipoQR)} ${tipoQR}</span>` 
                        : `<span class="celda-vacia">—</span>`}
                </td>
                <td>
                    <span class="es-badge ${r.entradaSalida || 'entrada'}">
                        ${esEmoji} ${esTexto}
                    </span>
                </td>
                <td>
                    ${motivo 
                        ? `<span class="motivo">${motivo}</span>` 
                        : `<span class="celda-vacia">—</span>`}
                </td>
            </tr>
        `;
    }).join('');

    tablaBody.innerHTML = html;

    // 🔍 Re-aplicar buscador si había término (por si paginan)
    buscadorClear.classList.toggle('visible', buscadorTabla.value.length > 0);
}

// ============================================================
//  PAGINACIÓN
// ============================================================
function renderPaginacion() {
    const totalPaginas = Math.ceil(totalReportes / LIMIT) || 1;
    const paginaMostrar = paginaActual + 1;

    pagInfo.textContent = `Página ${paginaMostrar} de ${totalPaginas}`;

    btnPrev.disabled = paginaActual === 0;
    btnNext.disabled = paginaActual >= totalPaginas - 1;
}

function actualizarTotal() {
    totalReportesSpan.textContent = `${totalReportes} reporte${totalReportes !== 1 ? 's' : ''}`;
}

// ============================================================
//  BUSCADOR EN LA TABLA
// ============================================================
function aplicarBuscadorTabla() {
    const termino = buscadorTabla.value.trim().toLowerCase();

    // Mostrar/ocultar botón de limpiar
    buscadorClear.classList.toggle('visible', termino.length > 0);

    const filas = tablaBody.querySelectorAll('tr');

    if (filas.length === 0) return;

    let visibles = 0;
    let filasReales = 0;

    filas.forEach(fila => {
        // Ignorar filas especiales
        if (fila.querySelector('.tabla-vacia')) return;
        filasReales++;

        const textoFila = fila.textContent.toLowerCase();

        if (!termino || textoFila.includes(termino)) {
            fila.style.display = '';
            visibles++;
        } else {
            fila.style.display = 'none';
        }
    });

    // Mensaje "sin resultados"
    let msgSinResultados = tablaBody.querySelector('.fila-sin-resultados');

    if (visibles === 0 && filasReales > 0) {
        if (!msgSinResultados) {
            msgSinResultados = document.createElement('tr');
            msgSinResultados.className = 'fila-sin-resultados';
            msgSinResultados.innerHTML = `
                <td colspan="9" class="tabla-vacia">
                    <span class="emoji">🔍</span>
                    No hay resultados para "<strong>${buscadorTabla.value.trim()}</strong>"
                </td>
            `;
            tablaBody.appendChild(msgSinResultados);
        } else {
            msgSinResultados.querySelector('.tabla-vacia').innerHTML = `
                <span class="emoji">🔍</span>
                No hay resultados para "<strong>${buscadorTabla.value.trim()}</strong>"
            `;
        }
    } else if (msgSinResultados) {
        msgSinResultados.remove();
    }
}

// ============================================================
//  RESUMEN
// ============================================================
async function cargarResumen() {
    try {
        const validos = reportes.filter(r => r.tipo === 'valido').length;
        const invalidos = reportes.filter(r => r.tipo === 'invalido').length;
        const basura = reportes.filter(r => r.tipo === 'basura').length;
        const entradas = reportes.filter(r => r.entradaSalida === 'entrada').length;

        resumenGrid.innerHTML = `
            <div class="resumen-card">
                <div class="resumen-icon verde">✅</div>
                <div class="resumen-info">
                    <span class="resumen-label">Válidos (página)</span>
                    <span class="resumen-value">${validos}</span>
                </div>
            </div>
            <div class="resumen-card">
                <div class="resumen-icon rojo">❌</div>
                <div class="resumen-info">
                    <span class="resumen-label">Inválidos (página)</span>
                    <span class="resumen-value">${invalidos}</span>
                </div>
            </div>
            <div class="resumen-card">
                <div class="resumen-icon gris">🗑️</div>
                <div class="resumen-info">
                    <span class="resumen-label">Basura (página)</span>
                    <span class="resumen-value">${basura}</span>
                </div>
            </div>
            <div class="resumen-card">
                <div class="resumen-icon morado">🚪</div>
                <div class="resumen-info">
                    <span class="resumen-label">Entradas (página)</span>
                    <span class="resumen-value">${entradas}</span>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('❌ Error cargando resumen:', error);
    }
}

// ============================================================
//  EXPORTAR A EXCEL (CSV)
//  🔥 SIN COLUMNA DE QR
// ============================================================
function exportarExcel() {
    if (reportes.length === 0) {
        alert('⚠️ No hay reportes para exportar');
        return;
    }

    // Encabezados (SIN QR)
    const headers = [
        'Fecha',
        'Tipo',
        'Residente',
        'Invitado',
        'Casa',
        'Placa',
        'Tipo QR',
        'Entrada/Salida',
        'Motivo'
    ];

    // Filas (SIN QR)
    const filas = reportes.map(r => [
        formatearFecha(r.timestamp),
        getTipoTexto(r.tipo),
        r.nombreResidente || '',
        r.nombre || '',
        r.nombreCasa || '',
        r.placa || '',
        r.tipoQR || '',
        r.entradaSalida || '',
        r.motivo || ''
    ]);

    // CSV
    const csv = [
        headers.join(','),
        ...filas.map(f => f.map(celda => `"${String(celda).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Descargar
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reportes_knovo_${idKnovo}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    //('✅ Exportado a CSV (sin columna QR)');
}

// ============================================================
//  EVENT LISTENERS
// ============================================================
btnAplicar.addEventListener('click', () => {
    paginaActual = 0;
    cargarReportes().then(() => cargarResumen());
});

btnLimpiar.addEventListener('click', () => {
    filtroTipo.value = '';
    filtroDesde.value = '';
    filtroHasta.value = '';
    buscadorTabla.value = '';
    buscadorClear.classList.remove('visible');
    paginaActual = 0;
    cargarReportes().then(() => cargarResumen());
});

btnExportar.addEventListener('click', exportarExcel);

btnPrev.addEventListener('click', () => {
    if (paginaActual > 0) {
        paginaActual--;
        cargarReportes().then(() => cargarResumen());
    }
});

btnNext.addEventListener('click', () => {
    const totalPaginas = Math.ceil(totalReportes / LIMIT);
    if (paginaActual < totalPaginas - 1) {
        paginaActual++;
        cargarReportes().then(() => cargarResumen());
    }
});

// ---------- Buscador en la tabla ----------
buscadorTabla.addEventListener('input', aplicarBuscadorTabla);

buscadorClear.addEventListener('click', () => {
    buscadorTabla.value = '';
    aplicarBuscadorTabla();
    buscadorTabla.focus();
});

// ============================================================
//  INICIALIZACIÓN
// ============================================================
(async function init() {
    if (!cargarInfoCondominio()) {
        tablaBody.innerHTML = `
            <tr>
                <td colspan="9" class="tabla-vacia">
                    <span class="emoji">⚠️</span>
                    No hay condominio seleccionado
                </td>
            </tr>
        `;
        return;
    }

    try {
        idKnovo = await obtenerIdKnovo();
        //console.log('✅ idKnovo:', idKnovo);

        await cargarReportes();
        await cargarResumen();

    } catch (error) {
        console.error('❌ Error en inicialización:', error);
        tablaBody.innerHTML = `
            <tr>
                <td colspan="9" class="tabla-vacia">
                    <span class="emoji">❌</span>
                    ${error.message}
                </td>
            </tr>
        `;
    }
})();