//const BACKEND_HOST = 'http://localhost:3000';

const BACKEND_HOST = 'https://sincronizapkbackend.onrender.com';

const DEFAULT_VALUES = {
  contrato: 0,
  fechaCuota: '2050-01-01',
  picol: 1,
  pitra: 1
};

// ========== CONFIGURACIÓN MQTT ========== //
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

// Interceptamos fetch para añadir headers
// const originalFetch = window.fetch;
// window.fetch = async (url, options = {}) => {
//   const newOptions = {
//     ...options,
//     headers: {
//       ...options.headers,
//       'x-mqtt-topic': getMqttTopic()
//     }
//   };
//   return originalFetch(url, newOptions);
// };

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


// ========== FUNCIONES AUXILIARES ========== //
async function fetchWithErrorHandling(url, options = {}) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Error en los datos recibidos');
    }
    return data;
  } catch (error) {
    console.error(`Error en fetch: ${url}`, error);
    throw error;
  }
}





// ========== FUNCIONES AUXILIARES ========== //
function llenarComboCategorias(data) {
    const select = document.getElementById('selectCategoria');
    select.innerHTML = data.map(cat => 
        `<option value="${cat.idconcepto}">${cat.concepto.trim()}</option>`
    ).join('');
}

function llenarComboCasetas(data) {
    const select = document.getElementById('selectCaseta');
    select.innerHTML = data.map(caseta => 
        `<option value="${caseta.iddispositivo}">${caseta.nombre.trim()}</option>`
    ).join('');
}

async function cargarCasetas() {
    try {
        const response = await fetch(`${BACKEND_HOST}/api/search/casetas`);
        if (!response.ok) throw new Error('Error en la respuesta del servidor');
        
        const { success, data } = await response.json();
        if (!success) throw new Error('Error en los datos recibidos');
        //cacheCasetas = data;
        llenarComboCasetas(data); // Sin cache, pura data fresca
    } catch (error) {
        console.error('Error cargando casetas:', error);
        document.getElementById('nuevaCaseta').innerHTML = `
            <option value="">Error al cargar casetas</option>
        `;
    }
}

async function cargarCategorias() {
    try {  
        const response = await fetch(`${BACKEND_HOST}/api/search/categorias`);
        if (!response.ok) throw new Error('Error en la respuesta del servidor');
        
        const { success, data } = await response.json();
        if (!success) throw new Error('Error en los datos recibidos');
        //cacheCategorias = data;
        llenarComboCategorias(data); // Directo al combo, sin cache
    } catch (error) {
        console.error('Error cargando categorías:', error);
        document.getElementById('nuevaCategoria').innerHTML = `
            <option value="">Error al cargar categorías</option>
        `;
    }
}

// ========== FUNCIONES DE BÚSQUEDA ========== //
async function buscarDatos(tipoBusqueda, query) {
  //if (!query.trim()) return;
  
  const resultsContainer = document.querySelector('.results-container');
  
  try {
    // Mostrar indicador de carga
    resultsContainer.innerHTML = `
      <div class="loading-indicator">
        <div class="spinner"></div>
        <p>Buscando...</p>
      </div>
    `;

    const { data } = await fetchWithErrorHandling(
      `${BACKEND_HOST}/api/search/${tipoBusqueda}?query=${encodeURIComponent(query)}`
    );

    mostrarResultados(data, tipoBusqueda);
    
  } catch (error) {
    console.error("Error en búsqueda:", error);
    resultsContainer.innerHTML = `
      <p class="error">⚠️ Error al buscar. Intenta de nuevo.</p>
    `;
  }
}

function mostrarResultados(data, tipoBusqueda) {
  const resultadosDiv = document.querySelector('.results-container');
  resultadosDiv.innerHTML = '';

  if (!data || !data.length) {
    resultadosDiv.innerHTML = `<p class="no-results">🔍 No hay resultados para "${tipoBusqueda}".</p>`;
    return;
  }

  const emojis = {
    direccion: '🏠',
    residente: '👤',
    placa: '🚗',
    tag: '🏷️',
    trabajador: '👷'
  };

  data.forEach(item => {
    const card = document.createElement('div');
    card.className = 'direccion-card';
    
    const contenidoCard = `
      <div class="card-header">
        <span class="emoji">${emojis[tipoBusqueda] || '🔍'}</span>
        <h3>${getTitle(tipoBusqueda, item)}</h3>
      </div>
      ${getDetails(tipoBusqueda, item)}
    `;

    card.innerHTML = contenidoCard;
    card.addEventListener('click', () => {
      window.location.href = `detalle-domicilio.html?id=${item.idcasa || ''}`;
    });

    resultadosDiv.appendChild(card);
  });
}

function getTitle(tipoBusqueda, item) {
  const titles = {
    direccion: item.direccion || 'Sin dirección',
    residente: item.nombre || 'Sin nombre',
    placa: `Placa: ${item.placa || 'Sin Placa'}`,
    tag: `Tag o Tarjeta: ${item.passw || 'Sin tag'}`,
    trabajador: `Trabajador: ${item.nombre || 'Sin nombre'}`
  };
  return titles[tipoBusqueda];
}

function getDetails(tipoBusqueda, item) {
  const details = {
    direccion: `
      <p><strong>Lote:</strong> ${item.lote || 'Sin lote'}</p>
      <p><strong>Restricción:</strong> ${item.restriccion || 'Sin restricción'}</p>
    `,
    residente: `
      <p><strong>Auto:</strong> ${item.auto || 'Sin Auto'}</p>
      <p><strong>Placa:</strong> ${item.placa || 'Sin Placa'}</p>
      <p><strong>Tag:</strong> ${item.passw || 'Sin tag'}</p>
    `,
    placa: `
      <p><strong>Auto:</strong> ${item.auto || 'Sin Auto'}</p>
      <p><strong>Dueño:</strong> ${item.nombre || 'Sin nombre'}</p>
      <p><strong>Tag:</strong> ${item.passw || 'Sin tag'}</p>
    `,
    tag: `
      <p><strong>Dueño:</strong> ${item.nombre || 'Sin nombre'}</p>
    `,
    trabajador: `
      <p><strong>Tarjeta:</strong> ${item.passw || 'Sin tarjeta'}</p>
      <p><strong>Observación:</strong> ${item.obs || 'Sin observación'}</p>
    `
  };
  return details[tipoBusqueda];
}

// Normaliza texto: mayúsculas, sin acentos, ni caracteres raros
function normalizarTexto(texto) {
    return texto
        .normalize("NFD") // Separa acentos
        .replace(/[\u0300-\u036f]/g, "") // Elimina acentos
        .replace(/[^a-zA-Z0-9\s]/g, "") // Solo letras, números y espacios
        .toUpperCase();
}

function abrirNuevaCasa() {
    Swal.fire({
        title: `<small>NUEVA CASA</small>`,
        html: `
            <div class="casa-grid">
            <!-- Contenedor del loading (oculto inicialmente) -->
                <div id="cargaCombos" class="loading-combos">
                    <div class="skeleton-loader"></div>
                    <div class="skeleton-loader"></div>
                </div>

                <!-- Campo de DIRECCIÓN EDITABLE -->
                <div class="campo-direccion">
                    <input type="text" placeholder="Ej. Calle Principal #123" id="inputDireccion" class="direccion-editable">
                </div>
                
                <!-- Columna Izquierda -->
                <div class="campo">
                    <label>Lote</label>
                    <input type="text" placeholder="Ej. Lote 5" id="inputLote">
                </div>
                <div class="campo">
                    <label>Categoría</label>
                    <select id="selectCategoria">
                        <option value="">Seleccione una categoría</option>
                        <!-- Opciones se llenarán dinámicamente -->
                    </select>
                </div>
                <div class="campo">
                    <label>Caseta</label>
                    <select id="selectCaseta">
                        <option value="">Seleccione una caseta</option>
                        <!-- Opciones se llenarán dinámicamente -->
                    </select>
                </div>

                <!-- Columna Derecha -->
                <div class="campo">
                    <label>Teléfono</label>
                    <input type="text" placeholder="Ej. 5512345678" id="inputTelefono">
                </div>
                <div class="campo">
                    <label>Restricción</label>
                    <textarea id="textareaRestriccion" placeholder="Ej. Solo visitas hasta las 10pm"></textarea>
                </div>
                <div class="campo">
                    <label>Contrato</label>
                    <input type="text" value="0" id="inputContrato">
                </div>
                <div class="campo">
                    <label>Fecha Cuota</label>
                    <input type="date" value="2050-01-01" id="inputFechaCuota">
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        focusConfirm: false,
        width: '750px',
        didOpen: async () => {
          const cargaCombos = document.getElementById('cargaCombos');
            if (cargaCombos) cargaCombos.style.display = 'block';

            // Aquí puedes cargar dinámicamente las opciones de categoría y caseta si es necesario
            // Ejemplo: cargarOpcionesCategoria();
            // Ejemplo: cargarOpcionesCaseta();
            try {
                await Promise.all([
                    await cargarCategorias(),
                    await cargarCasetas()
                ]);
            } catch (error) {
                console.error("Error cargando combos:", error);
            } finally {
                // Ocultar el loading después de cargar (éxito o error)
                if (cargaCombos) cargaCombos.style.display = 'none';
            }
        },
        preConfirm: () => {
            // Validación de dirección
            const direccionInput = document.getElementById('inputDireccion').value.trim();
            if (direccionInput.length < 4) {
                Swal.showValidationMessage("❌ La dirección debe tener al menos 4 caracteres");
                return false;
            }
            const direccionNormalizada = normalizarTexto(direccionInput);

            // Validación de lote (no obligatorio pero máximo 15 caracteres)
            const loteInput = document.getElementById('inputLote').value.trim();
            if (loteInput.length > 15) {
                Swal.showValidationMessage("❌ El lote no puede exceder los 15 caracteres");
                return false;
            }
            const loteNormalizado = normalizarTexto(loteInput);

            // Validación de categoría (debe estar seleccionada)
            const categoriaSelect = document.getElementById('selectCategoria');
            if (!categoriaSelect.value) {
                Swal.showValidationMessage("❌ Debe seleccionar una categoría");
                return false;
            }

            // Validación de caseta (debe estar seleccionada)
            const casetaSelect = document.getElementById('selectCaseta');
            if (!casetaSelect.value) {
                Swal.showValidationMessage("❌ Debe seleccionar una caseta");
                return false;
            }

            // Validación de teléfono (solo números si existe)
             const telefonoInput = document.getElementById('inputTelefono').value.trim();
             if (telefonoInput.length > 20)
             {
              Swal.showValidationMessage("❌ El teléfono debe contener menos de 20 caracteres");
             }
            // if (telefonoInput && !/^\d+$/.test(telefonoInput)) {
            //     Swal.showValidationMessage("❌ El teléfono debe contener solo números");
            //     return false;
            // }

            // Validación de contrato (debe ser numérico)
            const contratoInput = document.getElementById('inputContrato').value.trim();
            const contratoNumero = parseInt(contratoInput);
            if (isNaN(contratoNumero)) {
                Swal.showValidationMessage("❌ El contrato debe ser un número válido");
                return false;
            }

            return {
                direccion: direccionNormalizada,
                lote: loteNormalizado,
                categoria: categoriaSelect.value,
                caseta: casetaSelect.value,
                tel: telefonoInput,
                restriccion: normalizarTexto(document.getElementById('textareaRestriccion').value),
                contrato: contratoNumero,
                fcuota: document.getElementById('inputFechaCuota').value,
                // Campos adicionales que puedan necesitarse:
                idcasa: 0, // Para indicar que es nuevo registro
                idusuario: 1 // Ejemplo: ID del usuario logueado
            };
        },
        customClass: {
            popup: 'casa-popup',
            title: 'casa-title',
            htmlContainer: 'casa-html'
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            const datos = result.value;

            // Mostrar loader mientras se guarda
            Swal.fire({
                title: 'Guardando casa...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            try {
                // Llamar al endpoint para guardar casa
                // (Ajusta la URL según tu backend)
                 const response = await fetch(`${BACKEND_HOST}/api/casa/guardar`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ...datos,
                    picol:1,
                    pitra:1,
                    idusuario: 1,
                    idcasa: 0,
                    casetalog: datos.caseta,
                  }),
                });
                const data = await response.json();

                if (data.success) {
                    Swal.fire('¡Guardado!', 'Casa agregada correctamente', 'success').then(() => window.location.reload());;
                } else {
                    throw new Error(data.error || 'Error al guardar la casa');
                }
            } catch (error) {
                Swal.fire('Error', error.message, 'error');
            }
        }
        else
        {
            window.location.reload();
        }
        

    });
}


// Función para logout completo (por si acaso)
function logoutCompleto() {
    sessionStorage.removeItem('condominioSeleccionado');
    sessionStorage.removeItem('condominiosUsuario');
    window.location.href = 'index.html';
}

// ========== EVENT LISTENERS ========== //
document.addEventListener('DOMContentLoaded', () => {

   // 🔒 Validación de seguridad (PRIMERO QUE NADA)
    if (!sessionStorage.getItem('condominioSeleccionado')) {
        window.location.href = 'index.html'; // Redirige al login si no hay datos
        //console.log("No obtuve el condomino seccion");
        return; // Detiene la ejecución del resto del código
    }

    const condo = JSON.parse(sessionStorage.getItem('condominioSeleccionado'));
    //console.log("Datos del condominio:", condo);

    // Formatear la fecha de expiración (de '2025-12-06T06:00:00.000Z' a '06/12/2025')
    const formatExpiryDate = (dateString) => {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    // Actualizar los elementos del DOM con los datos del condominio
    if (condo) {
        // Actualizar el título principal
        const titleElement = document.querySelector('.page-title h1');
        if (titleElement) titleElement.textContent = condo.name.toUpperCase();

        // Actualizar la fecha de expiración
        const expiryElement = document.querySelector('.expiry-date');
        if (expiryElement && condo.deleted_at) {
            expiryElement.textContent = `Vigencia hasta: ${formatExpiryDate(condo.deleted_at)}`;
        }

        // (Si necesitas actualizar otros elementos, los agregamos aquí)
    } else {
        console.error('No se encontraron datos del condominio');
    }
   
  // Configurar buscadores
  document.querySelectorAll('.search-group input').forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {

        const condo = JSON.parse(sessionStorage.getItem('condominioSeleccionado'));
        //console.log("Datos del condominio:", condo);

        buscarDatos(input.id, e.target.value.trim());
      }
    });
  });

  // Botón agregar casa
  document.getElementById('agregarCasaBtn')?.addEventListener('click', abrirNuevaCasa);

     // Botón de salir
  document.querySelector('.btn-exit').addEventListener('click', () => {
  // Verificamos si hay condominios guardados en sessionStorage
      const condominiosGuardados = JSON.parse(sessionStorage.getItem('condominiosUsuario'));
      
      if (condominiosGuardados && condominiosGuardados.length > 0) {
          // Si hay condominios guardados, redirigimos a index.html donde se mostrará la pre-sala
          sessionStorage.removeItem('condominioSeleccionado');
          window.location.href = 'index.html';
      } else {
          // Si no hay condominios, hacemos logout completo
          logoutCompleto();
      }
  });


});
