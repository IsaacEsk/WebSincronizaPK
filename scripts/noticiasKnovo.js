const BACKEND_HOST = window.BACKEND_HOST;

const getMqttTopic = () => {
    try {
        const condoString = sessionStorage.getItem('condominioSeleccionado');
        if (!condoString) {
            console.error('No se encontró condominio seleccionado en sessionStorage');
            return 'query/default';
        }

        const condo = JSON.parse(condoString);
        if (!condo || !condo.id) {
            console.error('Condominio no tiene estructura válida', condo);
            return 'query/default';
        }

        return `query/${condo.id}`;
    } catch (error) {
        console.error('Error al obtener topic MQTT:', error);
        return 'query/error';
    }
};

const originalFetch = window.fetch;

window.fetch = async (url, options = {}) => {
    const timeout = options.timeout || 60000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const newOptions = {
        ...options,
        headers: {
            ...options.headers,
            'x-mqtt-topic': getMqttTopic()
        },
        signal: controller.signal
    };

    try {
        const response = await originalFetch(url, newOptions);
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            console.error(`Fetch timeout después de ${timeout}ms (URL: ${url})`);
            throw new Error(`El servidor no respondió en ${timeout / 1000} segundos`);
        }
        throw error;
    }
};

const noticias = [];
const CONDO_ID_KNOVO_STORAGE_KEY = 'knovoIduserCondominioId';
let categoriasNoticiasCargadas = false;
let solicitudCategoriasNoticias = null;
let guardandoNoticia = false;

function actualizarContadorNoticias() {
    const count = noticias.length;
    document.getElementById('newsCount').textContent =
        `${count} ${count === 1 ? 'noticia' : 'noticias'}`;
}

function mostrarEstadoNoticias(message, type) {
    const statusElement = document.getElementById('noticiasStatus');
    statusElement.textContent = message;
    statusElement.classList.remove(
        'noticias-status-error',
        'noticias-status-success',
        'noticias-status-empty'
    );
    statusElement.classList.add(`noticias-status-${type}`);
    statusElement.hidden = false;
}

function formatearFechaNoticia(createdAt) {
    const date = typeof createdAt === 'number'
        ? new Date(createdAt)
        : new Date(createdAt);

    if (Number.isNaN(date.getTime())) {
        return 'Fecha no disponible';
    }

    return new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(date);
}

function crearTarjetaNoticia(noticia) {
    const card = document.createElement('article');
    card.className = 'news-card';
    card.dataset.id = noticia.id || '';
    card.dataset.idNews = noticia.idNews || '';
    card.dataset.compositeKey = noticia.compositeKey || '';
    card.dataset.idUser = noticia.idUser || '';
    card.dataset.status = noticia.status || '';
    card.dataset.createdAt = noticia.createdAt ?? '';
    card.dataset.updatedAt = noticia.updatedAt ?? '';

    const cardHeader = document.createElement('div');
    cardHeader.className = 'news-card-header';

    const title = document.createElement('h3');
    title.className = 'news-title';
    title.textContent = noticia.title || 'Sin título';

    const category = document.createElement('span');
    category.className = 'news-category';
    category.textContent = noticia.categoria || 'Sin categoría';

    cardHeader.append(title, category);

    const body = document.createElement('p');
    body.className = 'news-body';
    body.textContent = noticia.body || 'Sin contenido.';

    const cardFooter = document.createElement('div');
    cardFooter.className = 'news-card-footer';

    const date = document.createElement('time');
    date.className = 'news-date';
    const createdAtDate = new Date(noticia.createdAt);
    date.dateTime = Number.isNaN(createdAtDate.getTime())
        ? ''
        : createdAtDate.toISOString();
    date.innerHTML = '<i class="far fa-calendar-alt" aria-hidden="true"></i>';
    date.append(` ${formatearFechaNoticia(noticia.createdAt)}`);

    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn-delete-news';
    deleteButton.type = 'button';
    deleteButton.title = 'Eliminar noticia';
    deleteButton.setAttribute('aria-label', `Eliminar noticia: ${noticia.title || 'Sin título'}`);
    deleteButton.innerHTML = '<i class="fas fa-trash-alt" aria-hidden="true"></i>';
    deleteButton.addEventListener('click', () => eliminarNoticia(noticia, card, deleteButton));

    cardFooter.append(date, deleteButton);
    card.append(cardHeader, body, cardFooter);

    return card;
}

async function eliminarNoticia(noticia, card, deleteButton) {
    const noticiaId = noticia.id || noticia.idNews;
    if (!noticiaId) {
        mostrarEstadoNoticias('No se puede eliminar esta noticia porque no tiene un identificador.', 'error');
        return;
    }

    if (!window.confirm(`¿Eliminar la noticia "${noticia.title || 'Sin título'}"? Esta acción no se puede deshacer.`)) {
        return;
    }

    deleteButton.disabled = true;
    deleteButton.classList.add('is-deleting');

    try {
        const response = await fetch(
            `${BACKEND_HOST}/api/noticiasknovo/${encodeURIComponent(noticiaId)}`,
            { method: 'DELETE' }
        );
        if (!response.ok) {
            throw new Error(`Error al eliminar la noticia: ${response.status}`);
        }

        card.remove();
        const noticiaIndex = noticias.indexOf(noticia);
        if (noticiaIndex !== -1) {
            noticias.splice(noticiaIndex, 1);
        }
        actualizarContadorNoticias();

        if (noticias.length === 0) {
            mostrarEstadoNoticias('No hay noticias publicadas.', 'empty');
        } else {
            mostrarEstadoNoticias('La noticia se eliminó correctamente.', 'success');
        }
    } catch (error) {
        console.error('Error al eliminar noticia KNOVO:', error);
        mostrarEstadoNoticias(error.message, 'error');
        deleteButton.disabled = false;
        deleteButton.classList.remove('is-deleting');
    }
}

async function obtenerIduser() {
    const condoString = sessionStorage.getItem('condominioSeleccionado');
    if (!condoString) {
        throw new Error('No hay un condominio seleccionado para obtener el usuario KNOVO');
    }

    let condo;
    try {
        condo = JSON.parse(condoString);
    } catch (error) {
        throw new Error('No se pudo leer el condominio seleccionado', { cause: error });
    }

    if (condo?.isvirtual === true) {
        const knovoIduser = condo.knovo_iduser;
        if ((typeof knovoIduser !== 'string' && typeof knovoIduser !== 'number') ||
            !String(knovoIduser).trim()) {
            throw new Error('El condominio virtual no tiene un identificador KNOVO válido (knovo_iduser)');
        }
        return String(knovoIduser).trim();
    }

    const condoId = condo?.id;
    if (!condoId) {
        throw new Error('El condominio seleccionado no tiene un identificador válido');
    }

    const storedIduser = sessionStorage.getItem('knovoIduser');
    const storedCondoId = sessionStorage.getItem(CONDO_ID_KNOVO_STORAGE_KEY);
    if (storedIduser && storedCondoId === String(condoId)) {
        return storedIduser;
    }

    sessionStorage.removeItem('knovoIdcoto');
    sessionStorage.removeItem('knovoIduser');
    sessionStorage.removeItem(CONDO_ID_KNOVO_STORAGE_KEY);

    const response = await fetch(`${BACKEND_HOST}/api/idnoticias`);
    if (!response.ok) {
        throw new Error(`Error al obtener los identificadores KNOVO: ${response.status}`);
    }

    const result = await response.json();
    const record = result?.data?.[0];
    if (result?.success !== true ||
        typeof record?.idcoto !== 'string' || !record.idcoto ||
        typeof record?.iduser !== 'string' || !record.iduser) {
        throw new Error('La respuesta no contiene los identificadores de KNOVO esperados');
    }

    sessionStorage.setItem('knovoIdcoto', record.idcoto);
    sessionStorage.setItem('knovoIduser', record.iduser);
    sessionStorage.setItem(CONDO_ID_KNOVO_STORAGE_KEY, String(condoId));
    return record.iduser;
}

function actualizarContadoresFormulario() {
    document.getElementById('contadorTitulo').textContent =
        `${document.getElementById('noticiaTitulo').value.length}/100`;
    document.getElementById('contadorNota').textContent =
        `${document.getElementById('noticiaNota').value.length}/200`;
}

function mostrarErrorCampo(errorId, message) {
    document.getElementById(errorId).textContent = message;
}

function limpiarErroresFormulario() {
    ['errorTitulo', 'errorCategoria', 'errorNota'].forEach(id => mostrarErrorCampo(id, ''));
}

function mostrarFeedbackModal(message, isError = false) {
    const feedback = document.getElementById('modalNoticiaFeedback');
    feedback.textContent = message;
    feedback.classList.toggle('is-error', isError);
    feedback.hidden = false;
}

function establecerEstadoGuardado(isSaving) {
    guardandoNoticia = isSaving;
    document.getElementById('btnGuardarNoticia').disabled = isSaving;
    document.getElementById('btnCancelarNoticia').disabled = isSaving;
    document.getElementById('btnCerrarModalNoticia').disabled = isSaving;
}

async function cargarCategoriasNoticias() {
    if (categoriasNoticiasCargadas) {
        return;
    }
    if (solicitudCategoriasNoticias) {
        return solicitudCategoriasNoticias;
    }

    const select = document.getElementById('noticiaCategoria');
    const saveButton = document.getElementById('btnGuardarNoticia');
    select.disabled = true;
    saveButton.disabled = true;
    select.replaceChildren(new Option('Cargando categorías...', ''));
    document.getElementById('modalNoticiaFeedback').hidden = true;

    solicitudCategoriasNoticias = (async () => {
        try {
            const condoString = sessionStorage.getItem('condominioSeleccionado');
            if (!condoString) {
                throw new Error('No hay un condominio seleccionado para cargar las categorías');
            }

            const condo = JSON.parse(condoString);
            let categorias;
            if (condo?.isvirtual === true) {
                categorias = [
                    'Seguridad',
                    'Mantenimiento',
                    'Eventos',
                    'General',
                    'Salubridad',
                    'Administrativo',
                    'Servicios'
                ];
            } else {
                const response = await fetch(`${BACKEND_HOST}/api/conceptos/noticias`);
                if (!response.ok) {
                    throw new Error(`Error al cargar categorías: ${response.status}`);
                }

                const result = await response.json();
                if (result?.success !== true || !Array.isArray(result.data)) {
                    throw new Error('La respuesta de categorías no tiene el formato esperado');
                }

                categorias = result.data
                    .map(item => item?.concepto)
                    .filter(concepto => typeof concepto === 'string' && concepto.trim())
                    .map(concepto => concepto.trim());
            }

            if (categorias.length === 0) {
                throw new Error('No hay categorías disponibles');
            }

            select.replaceChildren(new Option('Selecciona una categoría', ''));
            categorias.forEach(categoria => select.add(new Option(categoria, categoria)));
            categoriasNoticiasCargadas = true;
            select.disabled = false;
            saveButton.disabled = false;
        } catch (error) {
            console.error('Error al cargar categorías de Noticias KNOVO:', error);
            select.replaceChildren(new Option('No se pudieron cargar las categorías', ''));
            mostrarFeedbackModal(error.message, true);
        } finally {
            solicitudCategoriasNoticias = null;
        }
    })();

    return solicitudCategoriasNoticias;
}


// ============================================================
//  Obtener el idKnovo del condominio actual
// ============================================================
async function obtenerIdcoto() {
    const condoData = sessionStorage.getItem('condominioSeleccionado');
    if (!condoData) {
        throw new Error('No hay condominio seleccionado');
    }

    const condo = JSON.parse(condoData);

    // Si el condo tiene idKnovo directo en sessionStorage (ya guardado)
    if (condo.idKnovo) {
        return condo.idKnovo;
    }

    // Si no, lo pedimos al backend usando el idPostgres
    const res = await fetch(`${BACKEND_HOST}/api/knovo/${condo.id}/idknovo`);
    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error || 'No se pudo obtener el idKnovo');
    }

    return data.idKnovo;
}


function abrirModalNoticia() {
    const modal = document.getElementById('modalNoticia');
    modal.hidden = false;
    document.body.classList.add('modal-open');
    document.getElementById('noticiaTitulo').focus();
    limpiarErroresFormulario();
    cargarCategoriasNoticias();
}

function cerrarModalNoticia(force = false) {
    if (guardandoNoticia && !force) {
        return;
    }

    const modal = document.getElementById('modalNoticia');
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    document.getElementById('formNoticia').reset();
    document.getElementById('modalNoticiaFeedback').hidden = true;
    limpiarErroresFormulario();
    actualizarContadoresFormulario();
}

async function guardarNoticia(event) {
    event.preventDefault();
    if (guardandoNoticia) {
        return;
    }

    limpiarErroresFormulario();
    document.getElementById('modalNoticiaFeedback').hidden = true;

    const titulo = document.getElementById('noticiaTitulo').value.trim();
    const categoria = document.getElementById('noticiaCategoria').value;
    const nota = document.getElementById('noticiaNota').value.trim();
    let valid = true;
    let firstInvalidField = null;

    if (!titulo) {
        mostrarErrorCampo('errorTitulo', 'El título es obligatorio.');
        valid = false;
        firstInvalidField = 'noticiaTitulo';
    } else if (titulo.length > 100) {
        mostrarErrorCampo('errorTitulo', 'El título no puede superar 100 caracteres.');
        valid = false;
        firstInvalidField = 'noticiaTitulo';
    }

    if (!categoria) {
        mostrarErrorCampo('errorCategoria', 'Selecciona una categoría.');
        valid = false;
        if (!firstInvalidField) {
            firstInvalidField = 'noticiaCategoria';
        }
    }

    if (!nota) {
        mostrarErrorCampo('errorNota', 'La nota es obligatoria.');
        valid = false;
        if (!firstInvalidField) {
            firstInvalidField = 'noticiaNota';
        }
    } else if (nota.length > 200) {
        mostrarErrorCampo('errorNota', 'La nota no puede superar 200 caracteres.');
        valid = false;
        if (!firstInvalidField) {
            firstInvalidField = 'noticiaNota';
        }
    }

    if (!valid) {
        document.getElementById(firstInvalidField).focus();
        return;
    }

    establecerEstadoGuardado(true);

        try {
        const idUsuario = await obtenerIduser();
        const response = await fetch(`${BACKEND_HOST}/api/noticiasknovo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ titulo, nota, categoria, idUsuario })
        });

        const result = await response.json();
        if (!response.ok || result?.success !== true) {
            throw new Error(result?.message || result?.error || `Error al guardar la noticia: ${response.status}`);
        }
        if (!result.news || typeof result.news !== 'object' ||
            !(result.news.id || result.news.idNews)) {
            throw new Error('La respuesta no incluye una noticia válida para mostrar.');
        }

        // ---------- Mostrar la noticia en el UI ----------
        const noticia = result.news;
        noticias.push(noticia);
        const newsList = document.getElementById('newsList');
        newsList.appendChild(crearTarjetaNoticia(noticia));
        actualizarContadorNoticias();

        const statusElement = document.getElementById('noticiasStatus');
        statusElement.hidden = true;
        mostrarEstadoNoticias(result.message || 'La noticia se agregó correctamente.', 'success');
        cerrarModalNoticia(true);

        // ============================================================
        // 🔥 NOTIFICACIÓN MASIVA (no bloquea el flujo si falla)
        // ============================================================
        try {
            const idcoto = await obtenerIdcoto(); // ← tu función que saca el idKnovo

            // Armamos el texto de la notificación
            const textoNotificacion = `📰 Nueva noticia "${categoria}": "${titulo}" - "${nota}"`;

            // console.log('📤 Enviando notificación masiva:', {
            //     idcoto,
            //     texto: textoNotificacion
            // });

            const notifResponse = await fetch(`${BACKEND_HOST}/api/knovo/notificacionMasiva`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idcoto: idcoto,
                    texto: textoNotificacion
                })
            });

            const notifData = await notifResponse.json();

            if (!notifResponse.ok || !notifData.success) {
                console.warn('⚠️ No se pudo enviar la notificación masiva:', notifData);
            } else {
                //console.log('✅ Notificación masiva enviada:', notifData);
            }

        } catch (notifError) {
            // ⚠️ No rompemos el flujo principal si la notificación falla
            console.error('❌ Error al enviar notificación masiva:', notifError);
        }

    } catch (error) {
        console.error('Error al guardar noticia KNOVO:', error);
        mostrarFeedbackModal(error.message, true);
    } finally {
        establecerEstadoGuardado(false);
    }


    // try {
    //     const idUsuario = await obtenerIduser();
    //     const response = await fetch(`${BACKEND_HOST}/api/noticiasknovo`, {
    //         method: 'POST',
    //         headers: { 'Content-Type': 'application/json' },
    //         body: JSON.stringify({ titulo, nota, categoria, idUsuario })
    //     });

    //     const result = await response.json();
    //     if (!response.ok || result?.success !== true) {
    //         throw new Error(result?.message || result?.error || `Error al guardar la noticia: ${response.status}`);
    //     }
    //     if (!result.news || typeof result.news !== 'object' ||
    //         !(result.news.id || result.news.idNews)) {
    //         throw new Error('La respuesta no incluye una noticia válida para mostrar.');
    //     }

    //     const noticia = result.news;
    //     noticias.push(noticia);
    //     const newsList = document.getElementById('newsList');
    //     newsList.appendChild(crearTarjetaNoticia(noticia));
    //     actualizarContadorNoticias();

    //     const statusElement = document.getElementById('noticiasStatus');
    //     statusElement.hidden = true;
    //     mostrarEstadoNoticias(result.message || 'La noticia se agregó correctamente.', 'success');
    //     cerrarModalNoticia(true);
    // } catch (error) {
    //     console.error('Error al guardar noticia KNOVO:', error);
    //     mostrarFeedbackModal(error.message, true);
    // } finally {
    //     establecerEstadoGuardado(false);
    // }
}

document.addEventListener('DOMContentLoaded', async () => {
    const statusElement = document.getElementById('noticiasStatus');
    const condoNameElement = document.getElementById('condoName');
    const newsList = document.getElementById('newsList');

    document.getElementById('btnAgregarNoticia').addEventListener('click', abrirModalNoticia);
    document.getElementById('btnCancelarNoticia').addEventListener('click', cerrarModalNoticia);
    document.getElementById('btnCerrarModalNoticia').addEventListener('click', cerrarModalNoticia);
    document.getElementById('formNoticia').addEventListener('submit', guardarNoticia);
    document.getElementById('noticiaTitulo').addEventListener('input', actualizarContadoresFormulario);
    document.getElementById('noticiaNota').addEventListener('input', actualizarContadoresFormulario);
    document.getElementById('modalNoticia').addEventListener('click', event => {
        if (event.target === event.currentTarget) {
            cerrarModalNoticia();
        }
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !document.getElementById('modalNoticia').hidden) {
            cerrarModalNoticia();
        }
    });
    actualizarContadoresFormulario();

    if (!sessionStorage.getItem('userData') || !sessionStorage.getItem('condominioSeleccionado')) {
        window.location.replace('index.html');
        return;
    }

    try {
        const condo = JSON.parse(sessionStorage.getItem('condominioSeleccionado'));
        condoNameElement.textContent = `🏷️ ${condo.name || 'Condominio'}`;
        document.querySelector('.btn-back').href =
            condo.isvirtual === true ? 'virtualmain.html' : 'main.html';

        const iduser = await obtenerIduser();
        const params = new URLSearchParams({ idCliente: iduser });
        const response = await fetch(`${BACKEND_HOST}/api/noticiasknovo?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`Error al obtener las noticias: ${response.status}`);
        }

        const result = await response.json();
        if (result?.success !== true || !Array.isArray(result.news) ||
            !result.news.every(noticia => noticia && typeof noticia === 'object')) {
            throw new Error('La respuesta de noticias no tiene el formato esperado');
        }

        noticias.push(...result.news);
        actualizarContadorNoticias();

        if (noticias.length === 0) {
            statusElement.textContent = 'Todavía no hay noticias publicadas para este condominio.';
            statusElement.classList.add('noticias-status-empty');
            return;
        }

        const cards = document.createDocumentFragment();
        noticias.forEach(noticia => cards.appendChild(crearTarjetaNoticia(noticia)));
        newsList.appendChild(cards);
        statusElement.hidden = true;
    } catch (error) {
        console.error('Error al cargar Noticias KNOVO:', error);
        statusElement.textContent = `No se pudieron cargar las noticias: ${error.message}`;
        statusElement.classList.add('noticias-status-error');
    }
});
