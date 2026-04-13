// Reemplazado: const BACKEND_HOST = 'http://localhost:3000';
// //const BACKEND_HOST = 'https://sincronizapkbackend.onrender.com';

// Nuevo: tomar la URL desde config.js o fallback
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

function normalizarTexto(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim()
        .toUpperCase();
}

function ensureAdminqrSpinnerStyles() {
    if (document.getElementById('adminqr-spinner-style')) {
        return;
    }

    const style = document.createElement('style');
    style.id = 'adminqr-spinner-style';
    style.textContent = `
        @keyframes adminqr-spinner-spin {
            to { transform: rotate(360deg); }
        }
        .adminqr-spinner {
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 2px solid rgba(255, 255, 255, 0.9);
            border-top-color: transparent;
            border-radius: 50%;
            margin-right: 8px;
            vertical-align: middle;
            animation: adminqr-spinner-spin 0.8s linear infinite;
        }
        .adminqr-spinner.hidden {
            display: none;
        }
    `;
    document.head.appendChild(style);
}

const originalFetch = window.fetch;

window.fetch = async (url, options = {}) => {
  // 1. Timeout configurable (default: 8 segundos)
  const timeout = options.timeout || 60000; 
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // 2. Headers personalizados (incluyendo el tuyo)
  const newOptions = {
    ...options,
    headers: {
      ...options.headers,
      'x-mqtt-topic': getMqttTopic() // <- Tu header personalizado
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

document.addEventListener('DOMContentLoaded', async () => {
    ensureAdminqrSpinnerStyles();

    // Elementos del DOM
    const contenedorKnovo = document.getElementById('contenedor-knovo');
    const cardsContainer = document.getElementById('cards-container');
    const adminqrHeader = document.querySelector('.adminqr-header');

    try {
        // Verificar si la tabla existe (si tiene el servicio)
        const response = await fetch(`${BACKEND_HOST}/api/check-table?tableName=residentesqr`);
        const result = await response.json();
        const hasService = result.data[0].exists; // true o false

        if (hasService) {
            // Si tiene el servicio, cargar las cards
            await loadCards();
        } else {
            // Si no tiene el servicio, mostrar el iframe
            contenedorKnovo.style.display = 'block';
            cardsContainer.style.display = 'none';
            adminqrHeader.style.display = 'none';

            // Insertar el iframe
            contenedorKnovo.innerHTML = `
                <iframe 
                    src="https://eskayser.com/knovo/" 
                    width="100%" 
                    height="600px" 
                    frameborder="0" 
                    allowfullscreen>
                </iframe>
            `;
        }
    } catch (error) {
        console.error('Error verificando el servicio:', error);
    }
});

// Función para cargar las cards (tu código original)
async function loadCards() {
    const params = new URLSearchParams(window.location.search);
    const tipo = params.get('tipo') || 'aceptados'; // Ej: ?tipo=aceptados
    const tituloSeccion = document.getElementById('titulo-seccion');
    const buscador = document.getElementById('buscador-cards');
    const cardsContainer = document.getElementById('cards-container');
    const casaModal = document.getElementById('casa-select-modal');
    const casaSearch = document.getElementById('modal-casa-search');
    const casaList = document.getElementById('modal-casa-list');
    const modalAceptarBtn = document.getElementById('modal-aceptar-btn');
    const modalCancelarBtn = document.getElementById('modal-cancel-btn');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const successModal = document.getElementById('success-modal');
    const successCodeText = document.getElementById('success-code-text');
    const successCloseBtn = document.getElementById('success-close-btn');
    const successOkBtn = document.getElementById('success-ok-btn');

    let casasDisponibles = [];
    let casaSeleccionada = null;
    let personaPendienteAceptacion = null;
    let cardPendienteAceptacion = null;
    let idResultadoNuevo = null;

    const cerrarModalCasas = () => {
        casaModal.classList.add('hidden');
        casaList.innerHTML = '';
        casaSearch.value = '';
        casaSeleccionada = null;
        personaPendienteAceptacion = null;
        modalAceptarBtn.disabled = true;
    };

    const abrirModalExito = (codigo) => {
        if (!codigo) {
            return;
        }
        successCodeText.textContent = codigo;
        successModal.classList.remove('hidden');
    };

    const cerrarModalExito = () => {
        successModal.classList.add('hidden');
        successCodeText.textContent = '---';
    };

    const seleccionarCasa = (casa, elemento) => {
        casaSeleccionada = casa;
        modalAceptarBtn.disabled = false;
        casaList.querySelectorAll('.casa-item.selected').forEach(el => el.classList.remove('selected'));
        elemento.classList.add('selected');
    };

    const renderCasaList = (list) => {
        casaList.innerHTML = '';

        if (!list || list.length === 0) {
            casaList.innerHTML = '<p class="no-data">No se encontraron casas.</p>';
            return;
        }

        list.forEach(casa => {
            const item = document.createElement('div');
            item.className = 'casa-item';
            item.textContent = casa.direccion || `Casa ${casa.idcasa}`;
            item.addEventListener('click', () => seleccionarCasa(casa, item));
            casaList.appendChild(item);
        });
    };

    const filtrarCasas = (searchText) => {
        const filtro = searchText.toLowerCase();
        const filtradas = casasDisponibles.filter(casa => casa.direccion && casa.direccion.toLowerCase().includes(filtro));
        renderCasaList(filtradas);
    };

    const abrirModalCasas = async (persona, card) => {
        personaPendienteAceptacion = persona;
        cardPendienteAceptacion = card;
        casaSeleccionada = null;
        modalAceptarBtn.disabled = true;
        casaSearch.value = '';
        casaList.innerHTML = '<p class="modal-loading">Cargando casas...</p>';
        casaModal.classList.remove('hidden');

        try {
            const response = await fetch(`${BACKEND_HOST}/api/search/direccion?query=`);
            if (!response.ok) {
                throw new Error(`Error HTTP ${response.status}`);
            }

            const result = await response.json();
            casasDisponibles = result.data || [];
            renderCasaList(casasDisponibles);
        } catch (error) {
            console.error('Error cargando casas:', error);
            casaList.innerHTML = '<p class="no-data">No se pudieron cargar las casas. Intenta nuevamente.</p>';
        }
    };

    const guardarResidentePendiente = async () => {
        if (!personaPendienteAceptacion || !casaSeleccionada) {
            return;
        }

        const originalText = modalAceptarBtn.textContent;
        modalAceptarBtn.disabled = true;
        modalAceptarBtn.textContent = 'Guardando...';

        try {
            const datos = {
                idresidente: 0,
                nombre: `QR ${normalizarTexto(personaPendienteAceptacion.nombre)}`,
                auto: ' ',
                placa: ' ',
                passw: 0,
                obs: ' ',
                picol: 0,
                idfoto: 0,
                idcasa: casaSeleccionada.idcasa,
                idusuario: 1,
                casetalog: casaSeleccionada.caseta
            };

            const response = await fetch(`${BACKEND_HOST}/api/residente/guardar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });

            if (!response.ok) {
                throw new Error(`Error HTTP ${response.status}`);
            }

            const rawText = await response.text();
            console.log('residente guardar raw response text:', rawText);
            const result = JSON.parse(rawText || '{}');
            if (!result.success) {
                throw new Error(result.message || 'Error al guardar residente');
            }

            const savedResult = Array.isArray(result.data) ? result.data[0] : result.data;
            idResultadoNuevo = result.idResidente ?? savedResult?.id_resultado ?? savedResult?.d_resultado ?? null;
            console.log('residente guardar response:', result);
            console.log('id_resultado guardado:', idResultadoNuevo);
            console.log('idcoto:', idcoto);
            console.log('idAlta (usuario pendiente):', personaPendienteAceptacion.id);
            console.log('idapp (usuario pendiente):', personaPendienteAceptacion.id_app);

            const payloadAprobar = {
                idcoto: idcoto,
                idresidente: idResultadoNuevo,
                idAlta: personaPendienteAceptacion.id,
                idapp: personaPendienteAceptacion.id_app
            };
            console.log('payload aprobar usuarios:', payloadAprobar);

            if (!payloadAprobar.idcoto || !payloadAprobar.idresidente || !payloadAprobar.idAlta || !payloadAprobar.idapp) {
                throw new Error('Faltan datos para aprobar el usuario. Revisa idcoto, idresidente, idAlta o idapp.');
            }

            const responseAprobar = await fetch(`${BACKEND_HOST}/api/usuarios/aprobar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payloadAprobar)
            });

            if (!responseAprobar.ok) {
                throw new Error(`Error HTTP ${responseAprobar.status} en aprobar usuario`);
            }

            const resultAprobar = await responseAprobar.json();
            console.log('usuarios aprobar response:', resultAprobar);
            if (!resultAprobar.success) {
                throw new Error(resultAprobar.message || 'Error al aprobar usuario');
            }

            const validationCode = resultAprobar?.data?.password ?? resultAprobar?.data?.codigoActivacion ?? 'No disponible';
            console.log('Código de validación:', validationCode);

            if (cardPendienteAceptacion) {
                cardPendienteAceptacion.remove();
            }
            cerrarModalCasas();
            abrirModalExito(validationCode);
        } catch (error) {
            console.error('Error guardando residente:', error);
            alert('No se pudo dar de alta el usuario. Intenta nuevamente.');
            modalAceptarBtn.disabled = false;
            modalAceptarBtn.textContent = originalText;
        }
    };

    casaSearch.addEventListener('input', (event) => filtrarCasas(event.target.value));
    modalCancelarBtn.addEventListener('click', cerrarModalCasas);
    modalCloseBtn.addEventListener('click', cerrarModalCasas);
    modalAceptarBtn.addEventListener('click', guardarResidentePendiente);
    successCloseBtn.addEventListener('click', cerrarModalExito);
    successOkBtn.addEventListener('click', cerrarModalExito);

    // Obtener idcoto desde el backend
    let idcoto_compartida;
    let idcoto;
    let personas = [];
    try {
        const response = await fetch(`${BACKEND_HOST}/api/idcoto`);
        const result = await response.json();
        idcoto = result.data[0].envia;
        console.log('idcoto:', idcoto);

        // Obtener datos de cotos usando idcoto
        const response2 = await fetch(`${BACKEND_HOST}/api/cotos/${idcoto}`);
        const result2 = await response2.json();
        idcoto_compartida = result2.data[0].id;
        console.log('idcoto_compartida:', idcoto_compartida);

        // Fetch condicional según el tipo
        if (tipo === 'aceptados') {
            const response3 = await fetch(`${BACKEND_HOST}/api/usuarios-app/${idcoto_compartida}`);
            const usuariosAceptados = await response3.json();
            console.log('usuariosAceptados:', usuariosAceptados);
            personas = [
                ...usuariosAceptados.data.map(p => ({ ...p, tipo: "aceptados" })),
                // Mocks para otros tipos (vacíos por ahora)
            ];
        } else if (tipo === 'rechazados') {
            const response4 = await fetch(`${BACKEND_HOST}/api/usuarios-negados/${idcoto_compartida}`);
            const usuariosNegados = await response4.json();
            console.log('usuariosNegados:', usuariosNegados);
            personas = [
                ...usuariosNegados.data.map(p => ({ ...p, tipo: "rechazados" })),
            ];
        } else if (tipo === 'pendientes') {
            const response5 = await fetch(`${BACKEND_HOST}/api/usuarios-procesar/${idcoto_compartida}`);
            const usuariosProcesar = await response5.json();
            console.log('usuariosProcesar:', usuariosProcesar);
            personas = [
                ...usuariosProcesar.data.map(p => ({ ...p, tipo: "pendientes" })),
            ];
        }
    } catch (error) {
        console.error('Error obteniendo idcoto o cotos:', error);
    }

    // Actualizar título según el tipo
    const titulos = {
        aceptados: 'KNOVO - Aceptados',
        rechazados: 'KNOVO - Rechazados',
        pendientes: 'KNOVO - Pendientes'
    };
    tituloSeccion.textContent = titulos[tipo] || 'KNOVO';

    // Filtrar y mostrar cards
    function renderCards(personas) {
        cardsContainer.innerHTML = '';
        const filtradas = personas.filter(p => p.tipo === tipo);
        
        if (filtradas.length === 0) {
            cardsContainer.innerHTML = '<p class="no-data">No hay registros para mostrar.</p>';
            return;
        }

        filtradas.forEach(persona => {
            const card = document.createElement('div');
            card.className = 'card';
            if (tipo === 'aceptados') {
                card.innerHTML = `
                    <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 12px; background-color: #f9f9f9;">
                        <h3 style="margin: 0 0 8px 0; color: #333;">${persona.nombre}</h3>
                        <p style="margin: 4px 0;"><strong>Domicilio:</strong> ${persona.domicilio}</p>
                        <p style="margin: 4px 0;"><strong>Teléfono:</strong> ${persona.telefono}</p>
                        <p style="margin: 4px 0;"><strong>Password:</strong> ${persona.password}</p>
                        <button type="button" style="background-color: #ff4d4d; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-top: 8px; display: inline-flex; align-items: center; justify-content: center;" data-action="eliminar">
                            <span class="adminqr-spinner hidden"></span>
                            <span class="button-text">Eliminar</span>
                        </button>
                    </div>
                `;
            } else if (tipo === 'rechazados') {
                card.innerHTML = `
                    <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 12px; background-color: #f9f9f9;">
                        <h3 style="margin: 0 0 8px 0; color: #333;">${persona.nombre}</h3>
                        <p style="margin: 4px 0;"><strong>Domicilio:</strong> ${persona.domicilio}</p>
                        <p style="margin: 4px 0;"><strong>Teléfono:</strong> ${persona.telefono}</p>
                        <button type="button" data-action="regresar" style="background-color: #ffa500; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-top: 8px;">Regresar a por procesar</button>
                    </div>
                `;
            } else if (tipo === 'pendientes') {
                card.innerHTML = `
                    <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 12px; background-color: #f9f9f9;">
                        <h3 style="margin: 0 0 8px 0; color: #333;">${persona.nombre}</h3>
                        <p style="margin: 4px 0;"><strong>Domicilio:</strong> ${persona.domicilio}</p>
                        <p style="margin: 4px 0;"><strong>Teléfono:</strong> ${persona.telefono}</p>
                        <div style="margin-top: 8px;">
                            <button type="button" data-action="aceptar" style="background-color: #4CAF50; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-right: 8px;">Aceptar</button>
                            <button type="button" data-action="negar" style="background-color: #f44336; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">Rechazar</button>
                        </div>
                    </div>
                `;
            }

            if (tipo === 'aceptados') {
                const eliminarBtn = card.querySelector('button[data-action="eliminar"]');
                const spinner = eliminarBtn.querySelector('.adminqr-spinner');
                const buttonText = eliminarBtn.querySelector('.button-text');

                eliminarBtn.addEventListener('click', async () => {
                    const confirmDelete = confirm(`¿Deseas eliminar al residente "${persona.nombre}"?`);
                    if (!confirmDelete) {
                        return;
                    }

                    const codigoActivacion = persona.codigo_activacion;
                    if (!codigoActivacion) {
                        console.error('Falta codigo_activacion para el residente:', persona);
                        alert('No se pudo eliminar: falta código de activación.');
                        return;
                    }

                    const originalText = buttonText.textContent;
                    eliminarBtn.disabled = true;
                    spinner.classList.remove('hidden');
                    buttonText.textContent = 'Eliminando...';

                    try {
                        const response = await fetch(`${BACKEND_HOST}/api/eliminarusuarioQR/${encodeURIComponent(codigoActivacion)}`, {
                            method: 'POST'
                        });

                        if (!response.ok) {
                            throw new Error(`Error HTTP ${response.status}`);
                        }

                        const result = await response.json();
                        console.log('Eliminar usuario QR result:', result);

                        buttonText.textContent = 'Eliminado';
                        setTimeout(() => {
                            card.remove();
                        }, 500);
                    } catch (error) {
                        console.error('Error eliminando usuario:', error);
                        alert('No se pudo eliminar el residente. Intenta nuevamente.');
                        eliminarBtn.disabled = false;
                        spinner.classList.add('hidden');
                        buttonText.textContent = originalText;
                    }
                });
            }

            if (tipo === 'rechazados') {
                const regresarBtn = card.querySelector('button[data-action="regresar"]');
                regresarBtn.addEventListener('click', async () => {
                    const confirmReturn = confirm(`¿Deseas devolver a por procesar al usuario "${persona.nombre}"?`);
                    if (!confirmReturn) {
                        return;
                    }

                    regresarBtn.disabled = true;
                    const originalText = regresarBtn.textContent;
                    regresarBtn.textContent = 'Procesando...';

                    try {
                        const response = await fetch(`${BACKEND_HOST}/api/usuarios/desnegar/${encodeURIComponent(persona.id)}`, {
                            method: 'POST'
                        });

                        if (!response.ok) {
                            throw new Error(`Error HTTP ${response.status}`);
                        }

                        const result = await response.json();
                        console.log('Regresar a por procesar result:', result);

                        if (result.success === false) {
                            throw new Error(result.message || 'No se pudo actualizar el estado.');
                        }

                        alert('Usuario regresado a por procesar correctamente.');
                        setTimeout(() => {
                            card.remove();
                        }, 300);
                    } catch (error) {
                        console.error('Error regresando usuario a por procesar:', error);
                        alert('No se pudo regresar el usuario. Intenta nuevamente.');
                        regresarBtn.disabled = false;
                        regresarBtn.textContent = originalText;
                    }
                });
            }

            if (tipo === 'pendientes') {
                const aceptarBtn = card.querySelector('button[data-action="aceptar"]');
                const negarBtn = card.querySelector('button[data-action="negar"]');

                aceptarBtn.addEventListener('click', () => abrirModalCasas(persona, card));

                negarBtn.addEventListener('click', async () => {
                    const confirmReject = confirm(`¿Deseas rechazar al usuario "${persona.nombre}"?`);
                    if (!confirmReject) {
                        return;
                    }

                    negarBtn.disabled = true;
                    const originalText = negarBtn.textContent;
                    negarBtn.textContent = 'Procesando...';

                    try {
                        const response = await fetch(`${BACKEND_HOST}/api/usuarios/negar/${encodeURIComponent(persona.id)}`, {
                            method: 'POST'
                        });

                        if (!response.ok) {
                            throw new Error(`Error HTTP ${response.status}`);
                        }

                        const result = await response.json();
                        console.log('Negar usuario result:', result);

                        if (result.success === false) {
                            throw new Error(result.message || 'No se pudo negar el usuario.');
                        }

                        alert('Usuario rechazado correctamente.');
                        setTimeout(() => {
                            card.remove();
                        }, 300);
                    } catch (error) {
                        console.error('Error negando usuario:', error);
                        alert('No se pudo rechazar el usuario. Intenta nuevamente.');
                        negarBtn.disabled = false;
                        negarBtn.textContent = originalText;
                    }
                });
            }

            cardsContainer.appendChild(card);
        });
    }

    // Filtro de búsqueda
    buscador.addEventListener('input', (e) => {
        const texto = e.target.value.toLowerCase();
        const cards = document.querySelectorAll('.card');
        
        cards.forEach(card => {
            const nombre = card.querySelector('h3').textContent.toLowerCase();
            const domicilio = card.querySelector('p').textContent.toLowerCase();
            const coincide = nombre.includes(texto) || domicilio.includes(texto);
            card.style.display = coincide ? 'block' : 'none';
        });
    });

    // Renderizar cards con datos reales
    renderCards(personas);

}

