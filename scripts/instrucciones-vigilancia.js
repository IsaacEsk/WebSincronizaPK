
const BACKEND_HOST = 'https://sincronizapkbackend.onrender.com';

//const BACKEND_HOST = 'http://localhost:3000';


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


// Función para cargar las casas desde el backend
async function cargarCasas(query = '') {
    try {
        // Mostrar loading o estado de carga
        const housesList = document.querySelector('.houses-list');
        housesList.innerHTML = '<div class="loading">Cargando casas...</div>';
        
        // Hacer la petición al backend
        const response = await fetch(`${BACKEND_HOST}/api/search/direccion?query=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
            throw new Error('Error al cargar las casas');
        }
        
        const resultado = await response.json();
        
        // Verificar si la respuesta tiene éxito y datos
        if (!resultado.success || !resultado.data) {
            throw new Error('Respuesta inválida del servidor');
        }
        
        const casas = resultado.data;
        
        // Limpiar el listado
        housesList.innerHTML = '';
        
        // Verificar si hay resultados
        if (casas.length === 0) {
            housesList.innerHTML = '<div class="no-results">No se encontraron casas</div>';
            return;
        }
        
        // Crear elementos para cada casa
        casas.forEach(casa => {
            const houseItem = document.createElement('div');
            houseItem.className = 'house-item';
            houseItem.dataset.idcasa = casa.idcasa; // Guardar el ID para usarlo después
            
            // Mostrar dirección y lote (usar "Sin lote" si no viene)
            const lote = casa.lote && casa.lote.trim() !== '' ? casa.lote : 'Sin lote';
            
            houseItem.innerHTML = `
                <span class="house-address">${casa.direccion || 'Sin dirección'}</span>
                <span class="house-resident">Lote: ${lote}</span>
            `;
            
            // Agregar evento click
            houseItem.addEventListener('click', function() {
                // Remover selección anterior
                document.querySelectorAll('.house-item').forEach(item => {
                    item.classList.remove('selected');
                });
                
                // Agregar selección actual
                this.classList.add('selected');
                
                // Cargar los recados de esta casa
                cargarRecadosCasa(casa.idcasa);
            });
            
            housesList.appendChild(houseItem);
        });
        
    } catch (error) {
        console.error('Error:', error);
        document.querySelector('.houses-list').innerHTML = `
            <div class="error">
                Error al cargar las casas: ${error.message}
            </div>
        `;
    }
}

// Función para formatear fechas con nombres de meses
function formatearFechaBonita(fecha) {
    if (!fecha) return 'Sin fecha';
    
    const date = new Date(fecha);
    const meses = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    
    const dia = date.getDate();
    const mes = meses[date.getMonth()];
    const anio = date.getFullYear();
    
    return `${dia} de ${mes} de ${anio}`;
}



// Función para cargar recados de una casa específica (la implementaremos después)
async function cargarRecadosCasa(casaId) {
    console.log('Cargando recados para casa ID:', casaId);
    
    // Aquí está el cambio importante - usamos la clase correcta
    const recadosContainer = document.querySelector('.messages-list');
    
    try {
        const response = await fetch(`${BACKEND_HOST}/api/recados/casa?idcasa=${casaId}`);
        const result = await response.json();
        
        if (result.success && result.data) {
            const recados = result.data;
            console.log('Recados recibidos:', recados);
            
            // Limpiar contenedor antes de agregar nuevos recados
            recadosContainer.innerHTML = '';
            
            if (recados.length === 0) {
                recadosContainer.innerHTML = `
                    <div class="no-recados">
                        <i class="fas fa-clipboard-list fa-3x"></i>
                        <p>No hay recados registrados para esta casa</p>
                    </div>
                `;
                return;
            }
            
            // Crear tarjetas para cada recado
            recados.forEach(recado => {
                const recadoCard = document.createElement('div');
                recadoCard.className = `recado-card ${recado.activo === 1 ? 'activo' : 'inactivo'}`;
                
                // Formatear fechas
                // Formatear fechas con nombres de meses
                const fechaInicio = formatearFechaBonita(recado.fi);
                const fechaFin = recado.ff ? formatearFechaBonita(recado.ff) : 'Sin fecha final';
                
                // En la función cargarRecadosCasa, cambiamos el botón:
                recadoCard.innerHTML = `
                    <div class="recado-header">
                        <span class="recado-status ${esRecadoActivo(recado.ff) ? 'active' : 'inactive'}">
                            ${esRecadoActivo(recado.ff) ? 'Activo' : 'Inactivo'}
                        </span>
                        <span class="recado-dates">${fechaInicio} - ${fechaFin}</span>
                    </div>
                    <div class="recado-content">
                        <p>${recado.recado || 'Sin descripción'}</p>
                    </div>
                    <div class="recado-actions">
                        <button class="btn-editar" onclick="editarRecado(${JSON.stringify(recado).replace(/"/g, '&quot;')})">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        ${esRecadoActivo(recado.ff) ? `
                            <button class="btn-eliminar" onclick="cancelarRecado(${recado.idrecado})">
                                <i class="fas fa-times"></i> Cancelar
                            </button>
                        ` : ''}
                    </div>
                `;
                
                recadosContainer.appendChild(recadoCard);
            });
        } else {
            console.log('No se encontraron recados o error en la respuesta');
            recadosContainer.innerHTML = `
                <div class="no-recados">
                    <i class="fas fa-exclamation-triangle fa-3x"></i>
                    <p>Error al cargar los recados</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error al cargar recados:', error);
        recadosContainer.innerHTML = `
            <div class="error-recados">
                <i class="fas fa-exclamation-circle fa-3x"></i>
                <p>Error de conexión al cargar recados</p>
            </div>
        `;
    }
}

function esRecadoActivo(fechaFinal) {
    if (!fechaFinal) return true; // Si no hay fecha final, se considera activo
    
    const hoy = new Date();
    const ff = new Date(fechaFinal);
    
    return ff > hoy; // True si la fecha final es mayor a hoy
}

// Variables globales para el modal
const modalEditar = document.getElementById('modalEditar');
const closeModal = document.querySelector('.close');
const btnCancelarEdicion = document.getElementById('btnCancelarEdicion');
const formEditarRecado = document.getElementById('formEditarRecado');

// Función para abrir el modal con los datos del recado
function editarRecado(recadoData) {
    console.log('Editando recado:', recadoData);
    
    // Convertir de string a objeto si es necesario
    const recado = typeof recadoData === 'string' ? JSON.parse(recadoData) : recadoData;
    
    // Llenar el formulario con los datos del recado
    document.getElementById('editIdRecado').value = recado.idrecado;
    
    // Convertir fechas a formato YYYY-MM-DD para los inputs
    const fechaInicio = recado.fi ? recado.fi.slice(0, 10) : '';
    const fechaFin = recado.ff ? recado.ff.slice(0, 10) : '';
    
    document.getElementById('editFechaInicio').value = fechaInicio;
    document.getElementById('editFechaFin').value = fechaFin;
    document.getElementById('editRecado').value = recado.recado;
    document.getElementById('editIdCasa').value = recado.idcasa;
    
    // Mostrar el modal
    modalEditar.style.display = 'block';
}

// Función para guardar recado editado (VERSIÓN UTC)
async function guardarRecadoEditado() {
    const idrecado = document.getElementById('editIdRecado').value;
    const fi = document.getElementById('editFechaInicio').value;
    const ff = document.getElementById('editFechaFin').value;
    const recado = document.getElementById('editRecado').value.trim();
    const idcasa = document.getElementById('editIdCasa').value;
    
    // Obtener fechas en UTC para comparaciones justas
    const hoyUTC = obtenerHoyUTC();
    const fechaInicioUTC = fi ? resetearHorasUTC(fi) : null;
    const fechaFinUTC = ff ? resetearHorasUTC(ff) : null;
    
    console.log("Editando - Hoy UTC:", hoyUTC);
    console.log("Editando - Fecha inicio UTC:", fechaInicioUTC);
    console.log("Editando - Diferencia en ms:", fechaInicioUTC - hoyUTC);
    
    // Validación 1: El recado debe tener al menos 4 caracteres
    if (recado.length < 4) {
        mostrarAlerta('El recado debe tener al menos 4 caracteres', 'error');
        return false;
    }
    
    // Validación 1: El recado debe tener al menos 100 caracteres
    if (recado.length > 99) {
        mostrarAlerta('El recado debe tener menos de 100 caracteres', 'error');
        return false;
    }

    // Validación 2: La fecha de inicio no puede ser menor al día de hoy
    if (fechaInicioUTC && fechaInicioUTC < hoyUTC) {
        mostrarAlerta('La fecha de inicio no puede ser anterior al día de hoy', 'error');
        return false;
    }
    
    // Validación 3: Si hay fecha fin, no puede ser menor a la fecha inicial
    if (fechaFinUTC && fechaInicioUTC && fechaFinUTC < fechaInicioUTC) {
        mostrarAlerta('La fecha final no puede ser menor a la fecha inicial', 'error');
        return false;
    }
    
    const recadoDataFetch = {
        idrecado: idrecado,
        idcasa: idcasa,
        idusuario: 0,
        recado: recado,
        activo: 1,
        fi: fi ? new Date(fi + 'T00:00:00.000Z').toISOString() : null,
        ff: ff ? new Date(ff + 'T23:59:59.000Z').toISOString() : null,
        fa: new Date().toISOString()
    };
    
    try {
        const response = await fetch(`${BACKEND_HOST}/api/recado/guardar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(recadoDataFetch)
        });
        
        const result = await response.json();
        
        if (result.success) {
            mostrarAlerta('Recado actualizado exitosamente', 'success');
            return true;
        } else {
            mostrarAlerta('Error al guardar el recado: ' + (result.message || ''), 'error');
            return false;
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión con el servidor', 'error');
        return false;
    }
}

// Variables para el modal de nuevo recado
const modalNuevoRecado = document.getElementById('modalNuevoRecado');
const formNuevoRecado = document.getElementById('formNuevoRecado');

// Función para abrir el modal de nuevo recado
function abrirModalNuevoRecado() {
    // Verificar si hay una casa seleccionada
    const casaSeleccionada = document.querySelector('.house-item.selected');
    
    if (!casaSeleccionada) {
        mostrarAlerta('Primero debes seleccionar una casa', 'error');
        return;
    }
    
    // Obtener el ID de la casa seleccionada
    const idCasa = casaSeleccionada.dataset.idcasa;
    document.getElementById('nuevoIdCasa').value = idCasa;
    
    // Establecer fecha de inicio y fin como hoy
    const hoy = new Date();
    const fechaHoy = hoy.toISOString().split('T')[0];
    document.getElementById('nuevoFechaInicio').value = fechaHoy;
    document.getElementById('nuevoFechaFin').value = fechaHoy;
    
    // Limpiar campo de recado
    document.getElementById('nuevoRecado').value = '';
    
    // Mostrar el modal
    modalNuevoRecado.style.display = 'block';
}

// Función bien chingona para parsear fechas de inputs sin problemas de timezone
function parsearFechaInput(fechaStr) {
    if (!fechaStr) return null;
    
    // Split de la fecha en partes (YYYY-MM-DD)
    const partes = fechaStr.split('-');
    const año = parseInt(partes[0]);
    const mes = parseInt(partes[1]) - 1; // Meses en JS son 0-11
    const dia = parseInt(partes[2]);
    
    // Crear fecha en UTC para evitar pedos de timezone
    return new Date(Date.UTC(año, mes, dia));
}

// Función para resetear horas a 00:00:00 en UTC
function resetearHorasUTC(fecha) {
    if (!fecha) return null;
    
    // Si es string, parsearlo primero
    if (typeof fecha === 'string') {
        fecha = parsearFechaInput(fecha);
    }
    
    // Resetear a UTC midnight
    return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
}

// Función para obtener hoy en UTC midnight
function obtenerHoyUTC() {
    const ahora = new Date();
    return new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()));
}

// Función para guardar el nuevo recado (VERSIÓN CORREGIDA ALV)
async function guardarNuevoRecado() {
    const idcasa = document.getElementById('nuevoIdCasa').value;
    const fi = document.getElementById('nuevoFechaInicio').value;
    const ff = document.getElementById('nuevoFechaFin').value;
    const recado = document.getElementById('nuevoRecado').value.trim();
    
    // Obtener fechas en UTC para comparaciones justas
    const hoyUTC = obtenerHoyUTC();
    const fechaInicioUTC = fi ? resetearHorasUTC(fi) : null;
    const fechaFinUTC = ff ? resetearHorasUTC(ff) : null;
    
    console.log("Hoy UTC:", hoyUTC);
    console.log("Fecha inicio UTC:", fechaInicioUTC);
    console.log("Diferencia en ms:", fechaInicioUTC - hoyUTC);
    console.log("Es menor?", fechaInicioUTC < hoyUTC);
    
    // Validación 1: El recado debe tener al menos 4 caracteres
    if (recado.length < 4) {
        mostrarAlerta('El recado debe tener al menos 4 caracteres', 'error');
        return false;
    }
    // Validación 1: El recado debe tener al menos 4 caracteres
    if (recado.length > 99) {
        mostrarAlerta('El recado debe tener menos de 100 caracteres', 'error');
        return false;
    }
    
    // Validación 2: La fecha de inicio no puede ser menor al día de hoy
    if (fechaInicioUTC && fechaInicioUTC < hoyUTC) {
        mostrarAlerta('La fecha de inicio no puede ser anterior al día de hoy', 'error');
        return false;
    }
    
    // Validación 3: Si hay fecha fin, no puede ser menor a la fecha inicial
    if (fechaFinUTC && fechaInicioUTC && fechaFinUTC < fechaInicioUTC) {
        mostrarAlerta('La fecha final no puede ser menor a la fecha inicial', 'error');
        return false;
    }
    
    // Si pasó todas las validaciones, proceder con el guardado
    try {
        const response = await fetch(`${BACKEND_HOST}/api/recado/guardar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idcasa: idcasa,
                idusuario: 0,
                recado: recado,
                activo: 1,
                fi: fi ? new Date(fi + 'T00:00:00.000Z').toISOString() : null,
                ff: ff ? new Date(ff + 'T23:59:59.000Z').toISOString() : null,
                fa: new Date().toISOString()
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            mostrarAlerta('Recado guardado exitosamente', 'success');
            return true;
        } else {
            mostrarAlerta('Error al guardar el recado: ' + (result.message || ''), 'error');
            return false;
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión con el servidor', 'error');
        return false;
    }
}

// Validación en tiempo real para las fechas (VERSIÓN UTC)
document.getElementById('nuevoFechaInicio').addEventListener('change', function() {
    const fechaInicioUTC = resetearHorasUTC(this.value);
    const fechaFinInput = document.getElementById('nuevoFechaFin');
    const fechaFinUTC = fechaFinInput.value ? resetearHorasUTC(fechaFinInput.value) : null;
    
    const hoyUTC = obtenerHoyUTC();
    
    console.log("Validación tiempo real - Hoy UTC:", hoyUTC);
    console.log("Validación tiempo real - Fecha inicio UTC:", fechaInicioUTC);
    
    // Si la fecha de inicio es menor a hoy, mostrar advertencia
    if (fechaInicioUTC < hoyUTC) {
        mostrarAlerta('La fecha de inicio no puede ser anterior al día de hoy', 'warning');
        // Corregir automáticamente al día de hoy en formato YYYY-MM-DD
        const hoyLocal = new Date();
        const hoyFormatted = hoyLocal.toISOString().split('T')[0];
        this.value = hoyFormatted;
    }
    
    // Si la fecha fin es menor que la nueva fecha inicio, actualizarla
    if (fechaFinUTC && fechaInicioUTC && fechaFinUTC < fechaInicioUTC) {
        fechaFinInput.value = this.value;
    }
});

document.getElementById('nuevoFechaFin').addEventListener('change', function() {
    if (!this.value) return;
    
    const fechaFinUTC = resetearHorasUTC(this.value);
    const fechaInicioInput = document.getElementById('nuevoFechaInicio');
    const fechaInicioUTC = fechaInicioInput.value ? resetearHorasUTC(fechaInicioInput.value) : null;
    
    // Si la fecha fin es menor que la fecha inicio, mostrar advertencia
    if (fechaFinUTC && fechaInicioUTC && fechaFinUTC < fechaInicioUTC) {
        mostrarAlerta('La fecha final no puede ser menor a la fecha inicial', 'warning');
        this.value = fechaInicioInput.value; // Corregir automáticamente
    }
});

// Event listeners para el modal de nuevo recado
document.getElementById('btnAddMessage').addEventListener('click', abrirModalNuevoRecado);

formNuevoRecado.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (await guardarNuevoRecado()) {
        // Cerrar el modal después de guardar
        modalNuevoRecado.style.display = 'none';
        
        // Recargar los recados para ver los cambios
        const idCasa = document.getElementById('nuevoIdCasa').value;
        cargarRecadosCasa(idCasa);
    }
});

// Función genérica para cerrar modales
function cerrarModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Event listeners para cerrar modales
document.querySelectorAll('[data-modal]').forEach(element => {
    element.addEventListener('click', function() {
        cerrarModal(this.dataset.modal);
    });
});

// Cerrar modales al hacer clic fuera del contenido
window.addEventListener('click', function(event) {
    if (event.target === modalNuevoRecado) {
        modalNuevoRecado.style.display = 'none';
    }
    if (event.target === modalEditar) {
        modalEditar.style.display = 'none';
    }
});


// Cerrar modal al hacer clic en la X
closeModal.addEventListener('click', function() {
    modalEditar.style.display = 'none';
});

// Cerrar modal al hacer clic en Cancelar
btnCancelarEdicion.addEventListener('click', function() {
    modalEditar.style.display = 'none';
});

// Cerrar modal al hacer clic fuera del contenido
window.addEventListener('click', function(event) {
    if (event.target === modalEditar) {
        modalEditar.style.display = 'none';
    }
});


// Función para mostrar alertas elegantes
function mostrarAlerta(mensaje, tipo = 'success', titulo = '') {
    const toastContainer = document.getElementById('toastContainer');
    
    // Titulos por defecto según el tipo
    const titulos = {
        success: '¡Éxito!',
        error: 'Error',
        warning: 'Advertencia'
    };
    
    const iconos = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.innerHTML = `
        <i class="${iconos[tipo]}"></i>
        <div class="toast-content">
            <div class="toast-title">${titulo || titulos[tipo]}</div>
            <div class="toast-message">${mensaje}</div>
        </div>
        <button class="toast-close">&times;</button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Mostrar con animación
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Auto-eliminar después de 4 segundos
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
    
    // Cerrar al hacer click
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    });
}

// Manejar el envío del formulario de edición
formEditarRecado.addEventListener('submit', async function(e) {
    e.preventDefault();

    const idCasa = document.getElementById('editIdCasa').value; 
    
    if (await guardarRecadoEditado()) {
        // Cerrar el modal después de guardar
        modalEditar.style.display = 'none';
        
        // Recargar los recados para ver los cambios
        cargarRecadosCasa(idCasa);
    }
});

// Función para cancelar/eliminar recado
async function cancelarRecado(idRecado) {
    if (!confirm('¿Estás seguro de que quieres cancelar/eliminar este recado?')) {
        return;
    }
    
    try {
        // Cambiamos a PUT y la ruta del endpoint
        const response = await fetch(`${BACKEND_HOST}/api/recados/update`, {
            method: 'PUT',  // Cambiado de POST a PUT
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idrecado: idRecado
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            mostrarAlerta('Recado cancelado exitosamente', 'success');
            
            // Recargar los recados para ver los cambios
            const casaSeleccionada = document.querySelector('.house-item.selected');
            if (casaSeleccionada) {
                cargarRecadosCasa(casaSeleccionada.dataset.idcasa);
            }
        } else {
            mostrarAlerta('Error al cancelar el recado', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión con el servidor', 'error');
    }
}


// Función para formatear fecha al formato del input datetime-local
function formatearFechaParaInput(fecha) {
    if (!fecha) return '';
    return new Date(fecha).toISOString().slice(0, 16);
}


// Validación en tiempo real para el modal de edición
document.getElementById('editFechaInicio').addEventListener('change', function() {
    const fechaInicioUTC = resetearHorasUTC(this.value);
    const fechaFinInput = document.getElementById('editFechaFin');
    const fechaFinUTC = fechaFinInput.value ? resetearHorasUTC(fechaFinInput.value) : null;
    
    const hoyUTC = obtenerHoyUTC();
    
    console.log("Edit tiempo real - Hoy UTC:", hoyUTC);
    console.log("Edit tiempo real - Fecha inicio UTC:", fechaInicioUTC);
    
    // Si la fecha de inicio es menor a hoy, mostrar advertencia
    if (fechaInicioUTC < hoyUTC) {
        mostrarAlerta('La fecha de inicio no puede ser anterior al día de hoy', 'warning');
        // Corregir automáticamente al día de hoy en formato YYYY-MM-DD
        const hoyLocal = new Date();
        const hoyFormatted = hoyLocal.toISOString().split('T')[0];
        this.value = hoyFormatted;
    }
    
    // Si la fecha fin es menor que la nueva fecha inicio, actualizarla
    if (fechaFinUTC && fechaInicioUTC && fechaFinUTC < fechaInicioUTC) {
        fechaFinInput.value = this.value;
    }
});

document.getElementById('editFechaFin').addEventListener('change', function() {
    if (!this.value) return;
    
    const fechaFinUTC = resetearHorasUTC(this.value);
    const fechaInicioInput = document.getElementById('editFechaInicio');
    const fechaInicioUTC = fechaInicioInput.value ? resetearHorasUTC(fechaInicioInput.value) : null;
    
    // Si la fecha fin es menor que la fecha inicio, mostrar advertencia
    if (fechaFinUTC && fechaInicioUTC && fechaFinUTC < fechaInicioUTC) {
        mostrarAlerta('La fecha final no puede ser menor a la fecha inicial', 'warning');
        this.value = fechaInicioInput.value; // Corregir automáticamente
    }
});


// Validación en tiempo real para las fechas (VERSIÓN UTC)
document.getElementById('nuevoFechaInicio').addEventListener('change', function() {
    const fechaInicioUTC = resetearHorasUTC(this.value);
    const fechaFinInput = document.getElementById('nuevoFechaFin');
    const fechaFinUTC = fechaFinInput.value ? resetearHorasUTC(fechaFinInput.value) : null;
    
    const hoyUTC = obtenerHoyUTC();
    
    console.log("Validación tiempo real - Hoy UTC:", hoyUTC);
    console.log("Validación tiempo real - Fecha inicio UTC:", fechaInicioUTC);
    
    // Si la fecha de inicio es menor a hoy, mostrar advertencia
    if (fechaInicioUTC < hoyUTC) {
        mostrarAlerta('La fecha de inicio no puede ser anterior al día de hoy', 'warning');
        // Corregir automáticamente al día de hoy en formato YYYY-MM-DD
        const hoyLocal = new Date();
        const hoyFormatted = hoyLocal.toISOString().split('T')[0];
        this.value = hoyFormatted;
    }
    
    // Si la fecha fin es menor que la nueva fecha inicio, actualizarla
    if (fechaFinUTC && fechaInicioUTC && fechaFinUTC < fechaInicioUTC) {
        fechaFinInput.value = this.value;
    }
});

document.getElementById('nuevoFechaFin').addEventListener('change', function() {
    if (!this.value) return;
    
    const fechaFinUTC = resetearHorasUTC(this.value);
    const fechaInicioInput = document.getElementById('nuevoFechaInicio');
    const fechaInicioUTC = fechaInicioInput.value ? resetearHorasUTC(fechaInicioInput.value) : null;
    
    // Si la fecha fin es menor que la fecha inicio, mostrar advertencia
    if (fechaFinUTC && fechaInicioUTC && fechaFinUTC < fechaInicioUTC) {
        mostrarAlerta('La fecha final no puede ser menor a la fecha inicial', 'warning');
        this.value = fechaInicioInput.value; // Corregir automáticamente
    }
});



// Modificar el evento de búsqueda para usar nuestra nueva función
document.getElementById('searchHouses').addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase().trim();
    const houseItems = document.querySelectorAll('.house-item');
    
    houseItems.forEach(item => {
        const address = item.querySelector('.house-address').textContent.toLowerCase();
        const lote = item.querySelector('.house-resident').textContent.toLowerCase();
        
        // Verificar si el término de búsqueda coincide con dirección o lote
        if (address.includes(searchTerm) || lote.includes(searchTerm)) {
            item.style.display = 'block'; // Mostrar elemento
        } else {
            item.style.display = 'none';  // Ocultar elemento
        }
    });
});


// Cargar todas las casas al iniciar la página
document.addEventListener('DOMContentLoaded', function() {
    cargarCasas(''); // Query vacío para traer todas las casas
});