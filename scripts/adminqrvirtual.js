// ============================================================
//  adminqrvirtual.js - Knovo Virtual (Admin QR)
// ============================================================

// ---------- CONFIGURACIÓN ----------
const API_URL = window.BACKEND_HOST || 'http://localhost:3000';

// ---------- ESTADO ----------
let tipo = 'aceptados';
let idPostgres = null;
let idKnovo = null;
let personas = [];
let casasDisponibles = [];
let casaSeleccionada = null;
let personaPendienteAceptacion = null;
let cardPendienteAceptacion = null;

// ---------- DOM REFS ----------
const tituloSeccion = document.getElementById('titulo-seccion');
const buscador = document.getElementById('buscador-cards');
const cardsContainer = document.getElementById('cards-container');
const condoNameSpan = document.getElementById('condoName');

// Modal casas
const casaModal = document.getElementById('casa-select-modal');
const casaSearch = document.getElementById('modal-casa-search');
const casaList = document.getElementById('modal-casa-list');
const modalAceptarBtn = document.getElementById('modal-aceptar-btn');
const modalCancelarBtn = document.getElementById('modal-cancel-btn');
const modalCloseBtn = document.getElementById('modal-close-btn');

// Modal éxito
const successModal = document.getElementById('success-modal');
const successCodeText = document.getElementById('success-code-text');
const successCloseBtn = document.getElementById('success-close-btn');
const successOkBtn = document.getElementById('success-ok-btn');

// ============================================================
//  INFO CONDOMINIO (sessionStorage)
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
//  TIPO (query param)
// ============================================================
function obtenerTipo() {
    const params = new URLSearchParams(window.location.search);
    return params.get('tipo') || 'aceptados';
}

// ============================================================
//  FETCH 1: Obtener idKnovo a partir del idPostgres
// ============================================================
async function obtenerIdKnovo() {
    if (!idPostgres) {
        throw new Error('No hay idPostgres en sessionStorage');
    }

    const res = await fetch(`${API_URL}/api/knovo/${idPostgres}/idknovo`);
    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error || 'No se pudo obtener el idKnovo');
    }

    return data.idKnovo;
}

// ============================================================
//  FETCH 2: Obtener personas según tipo
// ============================================================
async function obtenerPersonas() {
    if (!idKnovo) {
        throw new Error('No hay idKnovo disponible');
    }

    let endpoint = '';

    if (tipo === 'aceptados') {
        endpoint = `/api/usuarios-app/${idKnovo}`;
    } else if (tipo === 'rechazados') {
        endpoint = `/api/usuarios-negados/${idKnovo}`;
    } else if (tipo === 'pendientes') {
        endpoint = `/api/usuarios-procesar/${idKnovo}`;
    } else {
        return [];
    }

    const res = await fetch(`${API_URL}${endpoint}`);
    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error || `Error al cargar ${tipo}`);
    }

    return data.data || [];
}

// ============================================================
//  CARGA PRINCIPAL (los 2 fetch encadenados)
// ============================================================
async function cargarTodo() {
    try {
        // Mostrar skeleton mientras carga
        cardsContainer.innerHTML = '<div class="card-skeleton"></div><div class="card-skeleton"></div>';

        // FETCH 1: idPostgres → idKnovo
        idKnovo = await obtenerIdKnovo();
        //console.log('✅ idKnovo obtenido:', idKnovo);

        // FETCH 2: idKnovo → personas
        personas = await obtenerPersonas();
        //console.log(`✅ ${personas.length} personas cargadas (${tipo})`);

        // Renderizar
        renderCards();

    } catch (error) {
        console.error('❌ Error cargando datos:', error);
        cardsContainer.innerHTML = `
            <p class="no-data">
                Error al cargar datos.<br>
                <small style="opacity:0.7;">${error.message}</small>
            </p>
        `;
    }
}

// ============================================================
//  RENDER CARDS
// ============================================================
function renderCards() {
    cardsContainer.innerHTML = '';

    if (personas.length === 0) {
        cardsContainer.innerHTML = '<p class="no-data">No hay registros para mostrar.</p>';
        return;
    }

    personas.forEach(persona => {
        const card = document.createElement('div');
        card.className = 'card';

        let badgeHTML = '';
        let actionsHTML = '';

        if (tipo === 'aceptados') {
            badgeHTML = `<span class="card-badge aceptado">✅ Aceptado</span>`;
            actionsHTML = `
                <button class="btn-card codigo" data-action="codigo">🔑 Ver código</button>
                <button class="btn-card eliminar" data-action="eliminar">🗑️ Eliminar</button>
            `;
        } else if (tipo === 'rechazados') {
            badgeHTML = `<span class="card-badge rechazado">❌ Rechazado</span>`;
            actionsHTML = `
                <button class="btn-card regresar" data-action="regresar">↩️ Regresar</button>
            `;
        } else if (tipo === 'pendientes') {
            badgeHTML = `<span class="card-badge pendiente">⏳ Pendiente</span>`;
            actionsHTML = `
                <button class="btn-card aceptar" data-action="aceptar">✅ Aceptar</button>
                <button class="btn-card negar" data-action="negar">❌ Rechazar</button>
            `;
        }

        // password puede venir como a.password, codigoActivacion, etc.
        const password = persona.password || persona.codigo_activacion || '';
        //console.log(persona);
        card.innerHTML = `
            <div class="card-header">
                <div class="card-emoji">👤</div>
                <div class="card-name">${persona.nombre || 'Sin nombre'}</div>
            </div>
            ${badgeHTML}
            <div class="card-info">
                <div class="card-info-row">
                    <span class="label">🏠 Domicilio:</span>
                    <span class="value">${persona.domicilio || '-'}</span>
                </div>
                <div class="card-info-row">
                    <span class="label">📞 Teléfono:</span>
                    <span class="value">${persona.telefono || '-'}</span>
                </div>
                ${password ? `
                <div class="card-info-row">
                    <span class="label">🔑 Password:</span>
                    <span class="value">${password}</span>
                </div>
                ` : ''}
            </div>
            <div class="card-actions">
                ${actionsHTML}
            </div>
        `;

        // ----- Listeners según tipo -----
        if (tipo === 'aceptados') {
            card.querySelector('[data-action="codigo"]').addEventListener('click', () => {
                abrirModalExito(password || '0000');
            });
            card.querySelector('[data-action="eliminar"]').addEventListener('click', () => {
                eliminarPersona(persona, card);
            });
        } else if (tipo === 'rechazados') {
            card.querySelector('[data-action="regresar"]').addEventListener('click', () => {
                regresarPersona(persona, card);
            });
        } else if (tipo === 'pendientes') {
            card.querySelector('[data-action="aceptar"]').addEventListener('click', () => {
                abrirModalCasas(persona, card);
            });
            card.querySelector('[data-action="negar"]').addEventListener('click', () => {
                negarPersona(persona, card);
            });
        }

        cardsContainer.appendChild(card);
    });
}



// ============================================================
//  CARGAR CASAS DESDE MONGO
// ============================================================
async function cargarCasasDelCondominio() {
    try {
        const res = await fetch(`${API_URL}/api/casas/${idPostgres}`);
        const data = await res.json();

        if (!res.ok && res.status !== 404) {
            throw new Error(data.error || 'Error al cargar casas');
        }

        return (data.casas || []).map(casa => ({
            idcasa: casa.idCasa,
            direccion: casa.nombre
        }));
    } catch (error) {
        console.error('❌ Error al cargar casas:', error);
        return [];
    }
}


// ============================================================
//  FORMATEAR NOMBRE PARA KNOVO
//  "Francisco Pérez" → "QR FRANCISCO PEREZ"
// ============================================================
function formatearNombreKnovo(nombre) {
    if (!nombre) return 'QR SIN NOMBRE';

    const limpio = String(nombre)
        .normalize('NFD')                       // Descompone acentos
        .replace(/[\u0300-\u036f]/g, '')        // Quita acentos
        .replace(/[^a-zA-Z0-9\s]/g, '')         // Quita caracteres raros
        .replace(/\s+/g, ' ')                   // Colapsa espacios múltiples
        .trim()
        .toUpperCase();

    return `QR ${limpio}`;
}


// ============================================================
//  ELIMINAR PERSONA (POST /api/knovo/eliminarusuarioQR/:codigo)
// ============================================================
async function eliminarPersona(persona, card) {
    // El código es el codigo_activacion del usuario
    const codigoActivacion = persona.codigo_activacion;

    if (!codigoActivacion) {
        alert('❌ No se encontró el código de activación del usuario');
        return;
    }

    const confirmar = confirm(`¿Eliminar a "${persona.nombre}"?\n\nEsta acción no se puede deshacer.`);
    if (!confirmar) return;

    // Buscar el botón y deshabilitarlo
    const btnEliminar = card.querySelector('[data-action="eliminar"]');
    const btnCodigo = card.querySelector('[data-action="codigo"]');
    const originalText = btnEliminar ? btnEliminar.textContent : '';

    if (btnEliminar) {
        btnEliminar.disabled = true;
        btnEliminar.textContent = 'Eliminando...';
    }
    if (btnCodigo) btnCodigo.disabled = true;

    try {
        const res = await fetch(
            `${API_URL}/api/knovo/eliminarusuarioQR/${idPostgres}/${encodeURIComponent(codigoActivacion)}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }
        );

        const data = await res.json();

        if (!res.ok || data.success === false) {
            throw new Error(data.error || data.message || 'No se pudo eliminar al usuario');
        }

        //console.log('✅ Usuario eliminado:', persona.nombre);

        // Animación de salida
        card.style.transition = 'opacity 0.3s, transform 0.3s';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';

        setTimeout(() => {
            card.remove();

            // Si ya no quedan cards, mostrar mensaje
            if (cardsContainer.querySelectorAll('.card').length === 0) {
                cardsContainer.innerHTML = '<p class="no-data">No hay registros para mostrar.</p>';
            }
        }, 300);

    } catch (error) {
        console.error('❌ Error al eliminar:', error);
        alert(error.message || 'Error de conexión con el servidor');

        // Revertir botones
        if (btnEliminar) {
            btnEliminar.disabled = false;
            btnEliminar.textContent = originalText;
        }
        if (btnCodigo) btnCodigo.disabled = false;
    }
}

// ============================================================
//  REGRESAR PERSONA (POST /api/usuarios/desnegar/:idAlta)
// ============================================================
async function regresarPersona(persona, card) {
    const idAlta = persona.id;

    if (!idAlta) {
        alert('❌ No se encontró el id del usuario');
        return;
    }

    const confirmar = confirm(`¿Regresar a "${persona.nombre}" a pendientes?`);
    if (!confirmar) return;

    // Buscar el botón dentro de la card
    const btnRegresar = card.querySelector('[data-action="regresar"]');
    const originalText = btnRegresar ? btnRegresar.textContent : '';

    if (btnRegresar) {
        btnRegresar.disabled = true;
        btnRegresar.textContent = 'Procesando...';
    }

    try {
        const res = await fetch(`${API_URL}/api/usuarios/desnegar/${idAlta}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await res.json();

        if (!res.ok || data.success === false) {
            throw new Error(data.error || data.message || 'No se pudo regresar al usuario');
        }

        //console.log('✅ Usuario regresado a pendientes:', persona.nombre);

        // Animación de salida
        card.style.transition = 'opacity 0.3s, transform 0.3s';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';

        setTimeout(() => {
            card.remove();

            // Si ya no quedan cards, mostrar mensaje
            if (cardsContainer.querySelectorAll('.card').length === 0) {
                cardsContainer.innerHTML = '<p class="no-data">No hay registros para mostrar.</p>';
            }
        }, 300);

    } catch (error) {
        console.error('❌ Error al regresar:', error);
        alert(error.message || 'Error de conexión con el servidor');

        // Revertir botón
        if (btnRegresar) {
            btnRegresar.disabled = false;
            btnRegresar.textContent = originalText;
        }
    }
}

// ============================================================
//  NEGAR PERSONA (POST /api/usuarios/negar/:idAlta)
// ============================================================
async function negarPersona(persona, card) {
    const idAlta = persona.id;
    
    if (!idAlta) {
        alert('❌ No se encontró el id del usuario');
        return;
    }

    const confirmar = confirm(`¿Rechazar a "${persona.nombre}"?`);
    if (!confirmar) return;

    // Buscar el botón dentro de la card y deshabilitarlo
    const btnNegar = card.querySelector('[data-action="negar"]');
    const btnAceptar = card.querySelector('[data-action="aceptar"]');
    const originalText = btnNegar ? btnNegar.textContent : '';

    if (btnNegar) {
        btnNegar.disabled = true;
        btnNegar.textContent = 'Procesando...';
    }
    if (btnAceptar) btnAceptar.disabled = true;

    try {
        const res = await fetch(`${API_URL}/api/usuarios/negar/${idAlta}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await res.json();

        if (!res.ok || data.success === false) {
            throw new Error(data.error || data.message || 'No se pudo rechazar al usuario');
        }

        //console.log('✅ Usuario rechazado:', persona.nombre);

        // Animación de salida
        card.style.transition = 'opacity 0.3s, transform 0.3s';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';

        setTimeout(() => {
            card.remove();

            // Si ya no quedan cards, mostrar mensaje
            if (cardsContainer.querySelectorAll('.card').length === 0) {
                cardsContainer.innerHTML = '<p class="no-data">No hay registros para mostrar.</p>';
            }
        }, 300);

    } catch (error) {
        console.error('❌ Error al rechazar:', error);
        alert(error.message || 'Error de conexión con el servidor');

        // Revertir botones
        if (btnNegar) {
            btnNegar.disabled = false;
            btnNegar.textContent = originalText;
        }
        if (btnAceptar) btnAceptar.disabled = false;
    }
}

// ============================================================
//  MODAL CASAS
// ============================================================
async function abrirModalCasas(persona, card) {
    personaPendienteAceptacion = persona;
    cardPendienteAceptacion = card;
    casaSeleccionada = null;
    modalAceptarBtn.disabled = true;
    casaSearch.value = '';
    casaList.innerHTML = '<p style="text-align:center; color:#8a94a6; padding:20px;">Cargando casas...</p>';
    casaModal.classList.add('active');

    // 🔥 Cargar casas reales desde Mongo
    casasDisponibles = await cargarCasasDelCondominio();

    if (casasDisponibles.length === 0) {
        casaList.innerHTML = '<p style="text-align:center; color:#8a94a6; padding:20px;">No hay casas registradas en este condominio.</p>';
        return;
    }

    renderCasaList(casasDisponibles);
}

function cerrarModalCasas() {
    casaModal.classList.remove('active');
    casaList.innerHTML = '';
    casaSearch.value = '';
    casaSeleccionada = null;
    personaPendienteAceptacion = null;
    modalAceptarBtn.disabled = true;
}

function renderCasaList(list) {
    casaList.innerHTML = '';

    if (!list || list.length === 0) {
        casaList.innerHTML = '<p style="text-align:center; color:#8a94a6; padding:20px;">No se encontraron casas.</p>';
        return;
    }

    list.forEach(casa => {
        const item = document.createElement('div');
        item.className = 'casa-item';
        item.textContent = casa.direccion;
        item.addEventListener('click', () => {
            casaSeleccionada = casa;
            modalAceptarBtn.disabled = false;
            casaList.querySelectorAll('.casa-item.selected').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
        });
        casaList.appendChild(item);
    });
}

function filtrarCasas(texto) {
    const filtro = texto.toLowerCase();
    const filtradas = casasDisponibles.filter(c =>
        c.direccion && c.direccion.toLowerCase().includes(filtro)
    );
    renderCasaList(filtradas);
}

// ============================================================
//  MODAL ÉXITO
// ============================================================
function abrirModalExito(codigo) {
    if (!codigo) return;
    successCodeText.textContent = codigo;
    successModal.classList.add('active');
}

function cerrarModalExito() {
    successModal.classList.remove('active');
    successCodeText.textContent = '---';
}

// ============================================================
//  CONFIRMAR ACEPTACIÓN (placeholder)
// ============================================================
// ============================================================
//  GUARDAR RESIDENTE PENDIENTE
//  1. Guarda residente en Mongo (POST /api/residentes)
//  2. Aprueba en PostgreSQL + actualiza Mongo (POST /api/knovo/aprobar)
// ============================================================
async function guardarResidentePendiente() {
    if (!personaPendienteAceptacion || !casaSeleccionada) return;

    const originalText = modalAceptarBtn.textContent;
    modalAceptarBtn.disabled = true;
    modalAceptarBtn.textContent = 'Guardando...';

    try {
        // ---------- PASO 1: Formatear nombre ----------
        const nombreFormateado = formatearNombreKnovo(personaPendienteAceptacion.nombre);
        //console.log('📝 Nombre formateado:', nombreFormateado);

        // ---------- PASO 2: Generar tag aleatorio ----------
        const tagAleatorio = 0;
        //console.log('🏷️ Tag generado:', tagAleatorio);

        // ---------- PASO 3: Guardar residente en Mongo ----------
        const resResidente = await fetch(`${API_URL}/api/residentes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                condominioId: idPostgres,
                idCasa: casaSeleccionada.idcasa,
                nombre: nombreFormateado,
                vehiculo: 'KNOVO',
                tag: tagAleatorio,
                permiso: true
            })
        });

        const dataResidente = await resResidente.json();

        if (!resResidente.ok) {
            throw new Error(dataResidente.error || 'Error al guardar residente en Mongo');
        }

        //console.log('✅ Residente guardado en Mongo:', dataResidente);

        // ---------- PASO 4: Extraer idResidente generado ----------
        const idResidenteMongo = dataResidente.residente?.idResidente;

        if (!idResidenteMongo) {
            throw new Error('No se obtuvo el idResidente de Mongo');
        }

        //console.log('🆔 idResidente Mongo:', idResidenteMongo);

        // ---------- PASO 5: Aprobar en PostgreSQL ----------
        const resAprobar = await fetch(`${API_URL}/api/knovo/aprobar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idcoto: idKnovo,                              // 127 (Knovo)
                idresidente: idResidenteMongo,                // El de Mongo
                idAlta: personaPendienteAceptacion.id,        // El del pendiente
                idapp: personaPendienteAceptacion.id_app      // El id_app del pendiente
            })
        });

        const dataAprobar = await resAprobar.json();

        if (!resAprobar.ok || !dataAprobar.success) {
            throw new Error(dataAprobar.error || dataAprobar.message || 'Error al aprobar usuario');
        }

        //console.log('✅ Usuario aprobado:', dataAprobar);

        // ---------- PASO 6: Extraer el PASSWORD (lo que se muestra al usuario) ----------
        const password = dataAprobar.data?.password || 'No disponible';

        // ---------- PASO 7: Cerrar modal, quitar card y mostrar éxito ----------
        cerrarModalCasas();

        if (cardPendienteAceptacion) {
            cardPendienteAceptacion.style.transition = 'opacity 0.3s, transform 0.3s';
            cardPendienteAceptacion.style.opacity = '0';
            cardPendienteAceptacion.style.transform = 'scale(0.9)';

            setTimeout(() => {
                cardPendienteAceptacion.remove();
                if (cardsContainer.querySelectorAll('.card').length === 0) {
                    cardsContainer.innerHTML = '<p class="no-data">No hay registros para mostrar.</p>';
                }
            }, 300);
        }

        abrirModalExito(password);

    } catch (error) {
        console.error('❌ Error al aprobar:', error);
        alert(error.message || 'Error de conexión con el servidor');
    } finally {
        modalAceptarBtn.disabled = false;
        modalAceptarBtn.textContent = originalText;
    }
}

// ============================================================
//  EVENT LISTENERS
// ============================================================
buscador.addEventListener('input', (e) => {
    const texto = e.target.value.toLowerCase();
    document.querySelectorAll('.card').forEach(card => {
        const nombre = card.querySelector('.card-name')?.textContent.toLowerCase() || '';
        const info = card.querySelector('.card-info')?.textContent.toLowerCase() || '';
        const coincide = nombre.includes(texto) || info.includes(texto);
        card.style.display = coincide ? 'flex' : 'none';
    });
});

casaSearch.addEventListener('input', (e) => filtrarCasas(e.target.value));
modalCancelarBtn.addEventListener('click', cerrarModalCasas);
modalCloseBtn.addEventListener('click', cerrarModalCasas);
modalAceptarBtn.addEventListener('click', guardarResidentePendiente);
successCloseBtn.addEventListener('click', cerrarModalExito);
successOkBtn.addEventListener('click', cerrarModalExito);

// Cerrar modales con click en overlay
casaModal.addEventListener('click', (e) => {
    if (e.target === casaModal) cerrarModalCasas();
});
successModal.addEventListener('click', (e) => {
    if (e.target === successModal) cerrarModalExito();
});

// Escape cierra modales
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (casaModal.classList.contains('active')) cerrarModalCasas();
    if (successModal.classList.contains('active')) cerrarModalExito();
});


// ============================================================
//  INICIALIZACIÓN
// ============================================================
tipo = obtenerTipo();

const titulos = {
    aceptados: 'Knovo · Aceptados',
    rechazados: 'Knovo · Rechazados',
    pendientes: 'Knovo · Pendientes'
};
tituloSeccion.textContent = titulos[tipo] || 'Knovo';

// Arrancar
if (cargarInfoCondominio()) {
    cargarTodo();
} else {
    cardsContainer.innerHTML = '<p class="no-data">No hay condominio seleccionado.</p>';
}