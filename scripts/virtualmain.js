
// ============================================================
//  virtualmain.js - Lógica del panel virtual (MongoDB)
// ============================================================

// ---------- CONFIGURACIÓN ----------
const API_URL = window.BACKEND_HOST || 'http://localhost:3000';

// ---------- ESTADO ----------
let casas = [];
let filteredCasas = [];
let condominioId = null;
let casaActual = null; // Casa abierta en el modal de residentes

// ---------- DOM REFS ----------
const grid = document.getElementById('cardsGrid');
const searchInput = document.getElementById('searchInput');
const btnAgregar = document.getElementById('btnAgregarCasa');
const btnKnovo = document.getElementById('btnKnovo');
const condoNameSpan = document.getElementById('condoName');

// Modal casa (agregar/editar)
const modal = document.getElementById('modalCasa');
const modalTitle = document.getElementById('modalTitle');
const modalInput = document.getElementById('modalInput');
const modalError = document.getElementById('modalError');
const modalCancel = document.getElementById('modalCancel');
const modalAccept = document.getElementById('modalAccept');
let modoModal = 'agregar';
let idCasaEditando = null;

// Modal residentes
const modalResidentes = document.getElementById('modalResidentes');
const modalResidentesTitle = document.getElementById('modalResidentesTitle');
const modalResidentesCasa = document.getElementById('modalResidentesCasa');
const modalResidentesClose = document.getElementById('modalResidentesClose');
const residentesList = document.getElementById('residentesList');
const btnAgregarResidente = document.getElementById('btnAgregarResidente');

// Modal nuevo residente
const modalNuevoRes = document.getElementById('modalNuevoResidente');
const resNombre = document.getElementById('resNombre');
const resVehiculo = document.getElementById('resVehiculo');
const resTag = document.getElementById('resTag');
const resPermiso = document.getElementById('resPermiso');
const modalResError = document.getElementById('modalResError');
const modalResCancel = document.getElementById('modalResCancel');
const modalResAccept = document.getElementById('modalResAccept');

// Modal Knovo
const modalKnovo = document.getElementById('modalKnovo');
const knovoCode = document.getElementById('knovoCode');
const knovoClose = document.getElementById('knovoClose');
const knovoCerrar = document.getElementById('knovoCerrar');

// ============================================================
//  INFO CONDOMINIO
// ============================================================
function cargarInfoCondominio() {
    const data = sessionStorage.getItem('condominioSeleccionado');
    if (!data) {
        condoNameSpan.textContent = '🏷️ No seleccionado';
        return;
    }
    try {
        const condo = JSON.parse(data);
        condominioId = condo.id;
        condoNameSpan.textContent = `🏷️ ${condo.name || 'Sin nombre'}`;
    } catch (e) {
        condoNameSpan.textContent = '🏷️ Error';
    }
}

// ============================================================
//  FETCH: OBTENER CASAS
// ============================================================
async function cargarCasas() {
    if (!condominioId) {
        renderMensajeVacio('No hay condominio seleccionado');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/casas/${condominioId}`);
        const data = await res.json();

        if (!res.ok && res.status !== 404) {
            throw new Error(data.error || 'Error al obtener casas');
        }

        casas = data.casas || [];
        filtrarCasas(searchInput.value);
    } catch (error) {
        console.error('❌ Error al cargar casas:', error);
        renderMensajeVacio('Error al cargar las casas. Revisa tu conexión.');
    }
}

// ============================================================
//  RENDER
// ============================================================
function renderMensajeVacio(mensaje) {
    grid.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:#8a94a6;">
            <div style="font-size:3rem; margin-bottom:12px;">🏚️</div>
            <p style="font-size:1.1rem;">${mensaje}</p>
        </div>
    `;
}

function renderCards(lista) {
    if (!grid) return;

    if (lista.length === 0) {
        renderMensajeVacio('No se encontraron casas');
        return;
    }

    const term = searchInput.value.trim().toLowerCase();

    const html = lista.map(casa => {
        const totalResidentes = (casa.residentes || []).length;

        // 🔥 Detectar si la casa apareció por un residente (y no por su nombre)
        const coincideCasa = casa.nombre.toLowerCase().includes(term);
        let residenteCoincidente = null;

        if (term && !coincideCasa) {
            residenteCoincidente = (casa.residentes || []).find(res =>
                (res.nombre || '').toLowerCase().includes(term) ||
                (res.vehiculo || '').toLowerCase().includes(term) ||
                String(res.tag || '').includes(term)
            );
        }

        // Badge de residente encontrado
        const badgeResidente = residenteCoincidente
            ? `<div class="badge-residente-match">
                   👤 ${residenteCoincidente.nombre}
               </div>`
            : '';

        return `
            <div class="casa-card" data-id="${casa.idCasa}">
                <div class="card-header" data-action="ver" data-id="${casa.idCasa}">
                    <span class="card-emoji">🏠</span>
                    <span class="card-name">${casa.nombre}</span>
                </div>
                ${badgeResidente}
                <div class="card-meta">
                    <span class="badge-residentes">👥 ${totalResidentes}</span>
                </div>
                <div class="card-actions">
                    <button class="btn-card edit" data-action="editar" data-id="${casa.idCasa}" title="Editar nombre">✏️</button>
                    <button class="btn-card delete" data-action="eliminar" data-id="${casa.idCasa}" title="Eliminar casa">🗑️</button>
                </div>
            </div>
        `;
    }).join('');

    grid.innerHTML = html;
}

// function renderCards(lista) {
//     if (!grid) return;

//     if (lista.length === 0) {
//         renderMensajeVacio('No hay casas registradas');
//         return;
//     }

//     const html = lista.map(casa => {
//         const totalResidentes = (casa.residentes || []).length;
//         return `
//             <div class="casa-card" data-id="${casa.idCasa}">
//                 <div class="card-header" data-action="ver" data-id="${casa.idCasa}">
//                     <span class="card-emoji">🏠</span>
//                     <span class="card-name">${casa.nombre}</span>
//                 </div>
//                 <div class="card-meta">
//                     <span class="badge-residentes">👥 ${totalResidentes}</span>
//                 </div>
//                 <div class="card-actions">
//                     <button class="btn-card edit" data-action="editar" data-id="${casa.idCasa}" title="Editar nombre">✏️</button>
//                     <button class="btn-card delete" data-action="eliminar" data-id="${casa.idCasa}" title="Eliminar casa">🗑️</button>
//                 </div>
//             </div>
//         `;
//     }).join('');

//     grid.innerHTML = html;
// }

function filtrarCasas(texto) {
    const term = texto.trim().toLowerCase();

    if (term === '') {
        filteredCasas = [...casas];
        renderCards(filteredCasas);
        return;
    }

    // 🔥 Filtrar por nombre de casa O por datos de residentes
    filteredCasas = casas.filter(casa => {
        // Coincide con el nombre de la casa
        if (casa.nombre.toLowerCase().includes(term)) return true;

        // Coincide con algún residente (nombre, vehículo, tag)
        const residentes = casa.residentes || [];
        return residentes.some(res =>
            (res.nombre || '').toLowerCase().includes(term) ||
            (res.vehiculo || '').toLowerCase().includes(term) ||
            String(res.tag || '').includes(term)
        );
    });

    renderCards(filteredCasas);
}

// ============================================================
//  MODAL CASA (Agregar/Editar)
// ============================================================
function abrirModal(modo = 'agregar', valorInicial = '', idCasa = null) {
    modoModal = modo;
    idCasaEditando = idCasa;

    modalTitle.textContent = modo === 'editar' ? 'Editar Casa' : 'Agregar Casa';
    modalInput.value = valorInicial;
    modalError.textContent = '';
    modalError.classList.remove('visible');
    modal.classList.add('active');
    setTimeout(() => modalInput.focus(), 100);
}

function cerrarModal() {
    modal.classList.remove('active');
    modalInput.value = '';
    modalError.textContent = '';
    modalError.classList.remove('visible');
}

function mostrarErrorModal(mensaje) {
    modalError.textContent = mensaje;
    modalError.classList.add('visible');
}

async function agregarCasa(nombreCasa) {
    try {
        const res = await fetch(`${API_URL}/api/casas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ condominioId, nombreCasa })
        });
        const data = await res.json();

        if (!res.ok) {
            mostrarErrorModal(data.error || 'Error al agregar la casa');
            return false;
        }
        cerrarModal();
        await cargarCasas();
        return true;
    } catch (error) {
        console.error('❌ Error al agregar casa:', error);
        mostrarErrorModal('Error de conexión con el servidor');
        return false;
    }
}

async function editarCasa(idCasa, nombreCasa) {
    try {
        const res = await fetch(`${API_URL}/api/casas/${condominioId}/${idCasa}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombreCasa })
        });
        const data = await res.json();

        if (!res.ok) {
            mostrarErrorModal(data.error || 'Error al editar la casa');
            return false;
        }
        cerrarModal();
        await cargarCasas();
        return true;
    } catch (error) {
        console.error('❌ Error al editar casa:', error);
        mostrarErrorModal('Error de conexión con el servidor');
        return false;
    }
}

// ============================================================
//  MODAL RESIDENTES (Ver)
// ============================================================
function abrirModalResidentes(idCasa) {
    const casa = casas.find(c => c.idCasa === idCasa);
    if (!casa) return;

    casaActual = casa;
    modalResidentesCasa.textContent = casa.nombre;
    renderResidentes(casa.residentes || []);
    modalResidentes.classList.add('active');
}

function cerrarModalResidentes() {
    modalResidentes.classList.remove('active');
    casaActual = null;
}

function renderResidentes(residentes) {
    if (residentes.length === 0) {
        residentesList.innerHTML = `
            <div class="residentes-empty">
                <span class="emoji">👤</span>
                <p>No hay residentes en esta casa</p>
            </div>
        `;
        return;
    }

    const html = residentes.map(res => `
        <div class="residente-item" data-tag="${res.tag}">
            <div class="residente-avatar">👤</div>
            <div class="residente-info">
                <div class="residente-nombre">${res.nombre}</div>
                <div class="residente-detalle">
                    <span>🚗 ${res.vehiculo}</span>
                    <span class="residente-tag">#${res.tag}</span>
                </div>
            </div>
            <div class="residente-actions">
                <label class="switch" title="Permiso de acceso">
                    <input type="checkbox" ${res.permiso ? 'checked' : ''} data-action="toggle-permiso" data-tag="${res.tag}" data-id="${res.idResidente}" />
                    <span class="switch-slider"></span>
                </label>
                <button class="btn-card delete" data-action="eliminar-residente" data-id="${res.idResidente}" data-tag="${res.tag}" data-nombre="${res.nombre}" title="Eliminar residente">🗑️</button>
            </div>
        </div>
    `).join('');

    residentesList.innerHTML = html;
}

// ============================================================
//  CAMBIAR PERMISO (PUT)
// ============================================================
async function cambiarPermiso(idCasa, idResidente, nuevoPermiso) {
    try {
        const res = await fetch(
            `${API_URL}/api/residentes/${condominioId}/${idCasa}/${idResidente}/permiso`,
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ permiso: nuevoPermiso })
            }
        );

        const data = await res.json();

        if (!res.ok) {
            console.error('❌ Error al cambiar permiso:', data.error);
            alert(data.error || 'Error al cambiar el permiso');
            return false;
        }

        // Actualizar el estado local sin recargar toda la lista
        const casa = casas.find(c => c.idCasa === idCasa);
        if (casa) {
            const residente = (casa.residentes || []).find(r => r.idResidente === idResidente);
            if (residente) residente.permiso = nuevoPermiso;
        }

        return true;
    } catch (error) {
        console.error('❌ Error al cambiar permiso:', error);
        alert('Error de conexión con el servidor');
        return false;
    }
}

// ============================================================
//  ELIMINAR RESIDENTE (DELETE)
// ============================================================
async function eliminarResidente(idCasa, idResidente, nombreResidente) {
    const confirmar = confirm(`¿Eliminar a "${nombreResidente}"?`);
    if (!confirmar) return false;

    try {
        const res = await fetch(
            `${API_URL}/api/residentes/${condominioId}/${idCasa}/${idResidente}`,
            { method: 'DELETE' }
        );

        const data = await res.json();

        if (!res.ok) {
            console.error('❌ Error al eliminar residente:', data.error);
            alert(data.error || 'Error al eliminar el residente');
            return false;
        }

        // Actualizar estado local
        const casa = casas.find(c => c.idCasa === idCasa);
        if (casa) {
            casa.residentes = (casa.residentes || []).filter(
                r => r.idResidente !== idResidente
            );
        }

        // Refrescar el modal de residentes
        if (casaActual && casaActual.idCasa === idCasa) {
            casaActual = casa;
            renderResidentes(casa.residentes || []);
        }

        // Refrescar las cards para actualizar el contador
        filtrarCasas(searchInput.value);

        return true;
    } catch (error) {
        console.error('❌ Error al eliminar residente:', error);
        alert('Error de conexión con el servidor');
        return false;
    }
}

// ============================================================
//  MODAL NUEVO RESIDENTE (Agregar)
// ============================================================
function abrirModalNuevoResidente() {
    resNombre.value = '';
    resVehiculo.value = '';
    resTag.value = '';
    resPermiso.checked = true;
    modalResError.textContent = '';
    modalResError.classList.remove('visible');
    modalNuevoRes.classList.add('active');
    setTimeout(() => resNombre.focus(), 100);
}

function cerrarModalNuevoResidente() {
    modalNuevoRes.classList.remove('active');
}

function mostrarErrorResidente(mensaje) {
    modalResError.textContent = mensaje;
    modalResError.classList.add('visible');
}

async function agregarResidente(datos) {
    try {
        const res = await fetch(`${API_URL}/api/residentes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        const data = await res.json();

        if (!res.ok) {
            mostrarErrorResidente(data.error || 'Error al agregar el residente');
            return false;
        }

        cerrarModalNuevoResidente();
        // Recargar casas para tener los residentes actualizados
        await cargarCasas();
        // Volver a abrir el modal de residentes con datos frescos
        const casaFresh = casas.find(c => c.idCasa === casaActual?.idCasa);
        if (casaFresh) {
            casaActual = casaFresh;
            renderResidentes(casaFresh.residentes || []);
        }
        return true;
    } catch (error) {
        console.error('❌ Error al agregar residente:', error);
        mostrarErrorResidente('Error de conexión con el servidor');
        return false;
    }
}

// ============================================================
//  EVENT LISTENERS - CARDS
// ============================================================
grid.addEventListener('click', async (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const id = parseInt(target.dataset.id, 10);

    if (action === 'ver') {
        abrirModalResidentes(id);
    } else if (action === 'editar') {
        const casa = casas.find(c => c.idCasa === id);
        if (casa) abrirModal('editar', casa.nombre, id);
    } else if (action === 'eliminar') {
        const casa = casas.find(c => c.idCasa === id);
        if (casa) await eliminarCasa(id, casa.nombre);
    }
});

// ============================================================
//  ELIMINAR CASA (DELETE)
// ============================================================
async function eliminarCasa(idCasa, nombreCasa) {
    const confirmar = confirm(`¿Eliminar "${nombreCasa}"?\n\n⚠️ Se eliminarán también todos sus residentes.`);
    if (!confirmar) return false;

    try {
        const res = await fetch(
            `${API_URL}/api/casas/${condominioId}/${idCasa}`,
            { method: 'DELETE' }
        );

        const data = await res.json();

        if (!res.ok) {
            console.error('❌ Error al eliminar casa:', data.error);
            alert(data.error || 'Error al eliminar la casa');
            return false;
        }

        // Recargar las casas desde el backend
        await cargarCasas();

        // Si el modal de residentes estaba abierto con esta casa, cerrarlo
        if (casaActual && casaActual.idCasa === idCasa) {
            cerrarModalResidentes();
        }

        return true;
    } catch (error) {
        console.error('❌ Error al eliminar casa:', error);
        alert('Error de conexión con el servidor');
        return false;
    }
}


// ============================================================
//  EVENT LISTENERS - MODAL CASA
// ============================================================
searchInput.addEventListener('input', (e) => filtrarCasas(e.target.value));
btnAgregar.addEventListener('click', () => abrirModal('agregar'));
btnKnovo.addEventListener('click', abrirModalKnovo);
modalCancel.addEventListener('click', cerrarModal);


// ============================================================
//  MODAL KNOVO
// ============================================================
function abrirModalKnovo() {
    // Obtener el código Knovo del condominio (viene de PostgreSQL)
    const data = sessionStorage.getItem('condominioSeleccionado');
    if (data) {
        try {
            const condo = JSON.parse(data);
            knovoCode.textContent = condo.knovo_code || '—— —— ——';
        } catch (e) {
            knovoCode.textContent = '—— —— ——';
        }
    } else {
        knovoCode.textContent = '—— —— ——';
    }

    modalKnovo.classList.add('active');
}

function cerrarModalKnovo() {
    modalKnovo.classList.remove('active');
}

// Event listeners del modal Knovo
knovoClose.addEventListener('click', cerrarModalKnovo);
knovoCerrar.addEventListener('click', cerrarModalKnovo);

modalKnovo.addEventListener('click', (e) => {
    if (e.target === modalKnovo) cerrarModalKnovo();
});

modalAccept.addEventListener('click', async () => {
    const nombre = modalInput.value.trim();
    if (nombre === '') {
        mostrarErrorModal('El nombre de la casa no puede estar vacío');
        return;
    }
    modalAccept.disabled = true;
    if (modoModal === 'editar') {
        await editarCasa(idCasaEditando, nombre);
    } else {
        await agregarCasa(nombre);
    }
    modalAccept.disabled = false;
});

modalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); modalAccept.click(); }
});

modal.addEventListener('click', (e) => {
    if (e.target === modal) cerrarModal();
});

// ============================================================
//  EVENT LISTENERS - MODAL RESIDENTES
// ============================================================
modalResidentesClose.addEventListener('click', cerrarModalResidentes);
modalResidentes.addEventListener('click', (e) => {
    if (e.target === modalResidentes) cerrarModalResidentes();
});

btnAgregarResidente.addEventListener('click', abrirModalNuevoResidente);

// ============================================================
//  LISTENER: Eliminar residente (click en 🗑️)
// ============================================================
residentesList.addEventListener('click', async (e) => {
    const btnDelete = e.target.closest('[data-action="eliminar-residente"]');
    if (!btnDelete) return;

    // Asegurarnos que haya una casa actual
    if (!casaActual) {
        console.warn('⚠️ No hay casaActual definida');
        return;
    }

    const idResidente = parseInt(btnDelete.dataset.id, 10);
    const nombreResidente = btnDelete.dataset.nombre;

    if (isNaN(idResidente)) {
        console.warn('⚠️ idResidente inválido');
        return;
    }

    await eliminarResidente(casaActual.idCasa, idResidente, nombreResidente);
});

// ============================================================
//  LISTENER: Cambiar permiso (switch)
// ============================================================
residentesList.addEventListener('change', async (e) => {
    const input = e.target.closest('[data-action="toggle-permiso"]');
    if (!input) return;

    const idResidente = parseInt(input.dataset.id, 10);
    const nuevoPermiso = input.checked;
    const estadoAnterior = !nuevoPermiso;

    // Deshabilitar mientras se procesa (para evitar doble click)
    input.disabled = true;

    const exito = await cambiarPermiso(casaActual.idCasa, idResidente, nuevoPermiso);

    if (!exito) {
        // Revertir si falló
        input.checked = estadoAnterior;
    }

    input.disabled = false;
});

// ============================================================
//  EVENT LISTENERS - MODAL NUEVO RESIDENTE
// ============================================================
modalResCancel.addEventListener('click', cerrarModalNuevoResidente);
modalNuevoRes.addEventListener('click', (e) => {
    if (e.target === modalNuevoRes) cerrarModalNuevoResidente();
});

modalResAccept.addEventListener('click', async () => {
    const nombre = resNombre.value.trim();
    const vehiculo = resVehiculo.value.trim();
    const tag = parseInt(resTag.value, 10);

    if (!nombre) return mostrarErrorResidente('El nombre es obligatorio');
    if (!vehiculo) return mostrarErrorResidente('El vehículo es obligatorio');
    if (isNaN(tag)) return mostrarErrorResidente('El tag es obligatorio');
    if (tag < 0 || tag > 16777215) return mostrarErrorResidente('El tag debe estar entre 0 y 16,777,215');

    if (!casaActual) return mostrarErrorResidente('No hay casa seleccionada');

    modalResAccept.disabled = true;
    await agregarResidente({
        condominioId,
        idCasa: casaActual.idCasa,
        nombre,
        vehiculo,
        tag,
        permiso: resPermiso.checked
    });
    modalResAccept.disabled = false;
});

// Escape cierra cualquier modal activo
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (modal.classList.contains('active')) cerrarModal();
    if (modalNuevoRes.classList.contains('active')) cerrarModalNuevoResidente();
    else if (modalResidentes.classList.contains('active')) cerrarModalResidentes();
    if (modalKnovo.classList.contains('active')) cerrarModalKnovo();
});

// Navegación a páginas nuevas
const btnImportarExcel = document.getElementById('btnImportarExcel');
const btnReportesQR = document.getElementById('btnReportesQR');

btnImportarExcel.addEventListener('click', () => {
    window.location.href = 'importaexcel.html';
});

btnReportesQR.addEventListener('click', () => {
    // Por ahora redirige a adminqrvirtual por defecto
    // Después haremos la página de reportes
    //window.location.href = 'adminqrvirtual.html?tipo=aceptados';
    window.location.href = 'reportesqrvirtual.html';
});




// ============================================================
//  INICIALIZACIÓN
// ============================================================
cargarInfoCondominio();
cargarCasas();