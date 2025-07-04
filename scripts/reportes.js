
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




document.addEventListener('DOMContentLoaded', () => {

    
    const tablaBody = document.querySelector('#tabla-reportes tbody');
    tablaBody.innerHTML = `
        <tr>
            <td colspan="5" class="mensaje-inicial"> 
                🚨 ¡Selecciona una fecha y dale clic en <strong>Buscar</strong>! 
            </td>
        </tr>
    `;

    // Setear fecha actual por defecto
    const fechaInput = document.getElementById('fecha-reporte');
    fechaInput.valueAsDate = new Date();
    
    // Obtener parámetro de URL para saber qué reporte mostrar
    const urlParams = new URLSearchParams(window.location.search);
    const tipoReporte = urlParams.get('tipo') || 'vehicular';
    
    // Actualizar título según el tipo de reporte
    const titulos = {
        vehicular: 'Visitantes Vehiculares',
        peatonal: 'Visitantes Peatonales',
        trabajadores: 'Trabajadores',
        residentes: 'Residentes'
    };
    document.getElementById('titulo-reporte').textContent = `Reporte de ${titulos[tipoReporte]}`;
    
    // Botón Buscar
    document.getElementById('buscar-btn').addEventListener('click', cargarReporte);
    
    // Botón Exportar
    document.getElementById('exportar-btn').addEventListener('click', exportarAExcel);
    
    // Cargar datos iniciales
    //cargarReporte();
});

document.getElementById('regresar-btn').addEventListener('click', function() {
    window.history.back();
    // O si prefieres redirigir a una página específica:
    // window.location.href = 'tu_pagina_anterior.html';
});


let cacheReportes = {};


async function cargarReporte() {
cacheReportes = {};
  const tipo = new URLSearchParams(window.location.search).get('tipo');
  const fecha = document.getElementById('fecha-reporte').value;
  const tabla = document.getElementById('tabla-reportes');
  const tbody = tabla.querySelector('tbody');

  // Configurar encabezados según el tipo de reporte ANTES de cargar
  configurarEncabezados(tipo);

  tbody.innerHTML = `
        <tr class="loading">
            <td colspan="5">
                <div class="spinner"></div>
                <p style="text-align: center;">Cargando datos...</p>
            </td>
        </tr>
    `;
  try {
    const response = await fetch(`${BACKEND_HOST}/api/reportes/${tipo}?fechaInicio=${fecha}&fechaFin=${fecha}`);
    const { data } = await response.json();
    //console.log(data);
    cacheReportes = data;
    renderizarTabla(data,tipo);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

function renderizarTabla(datos,tipo) {
    const tabla = document.getElementById('tabla-reportes');
    const tbody = tabla.querySelector('tbody');
    
    // Limpiar tabla antes de renderizar
    tbody.innerHTML = '';

    if (!datos || datos.length === 0) {
        tbody.innerHTML = `
            <tr class="no-data">
                <td colspan="5">No se encontraron registros</td>
            </tr>
        `;
        return;
    }

    switch (tipo)
    {

    case 'vehicular':
    // Crear filas con los datos
    datos.forEach(item => {
        const tr = document.createElement('tr');
        
        tr.style.cursor = 'pointer'; // Cambia el cursor para indicar que es clickeable
        tr.dataset.id = item.idregistro; // Guardamos el ID en el atributo data
        
        // Formatear fecha bonita (de "2023-06-07T05:59:49.323Z" a "07/06/2023 05:59")
        const fechaFormateada = new Date(item.fecha).toLocaleString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        // Icono dinámico según acción (ENTRO/SALIO)
        const iconoAccion = item.accion === 'ENTRO' 
            ? '<i class="fas fa-sign-in-alt text-success"></i>' 
            : '<i class="fas fa-sign-out-alt text-danger"></i>';

        tr.innerHTML = `
            <td>${fechaFormateada}</td>
            <td>
                ${item.placa || 'N/A'}
                ${item.gafete ? `<span class="badge">Gafete: ${item.gafete}</span>` : ''}
            </td>
            <td>${item.conductor}</td>
            <td>${item.destino}</td>
            <td class="acciones">
                ${iconoAccion} ${item.accion}
            </td>
        `;
        // Añadimos el evento a toda la fila
        tr.addEventListener('click', (e) => {
            // Evita que se active si clickeaste un enlace/botón dentro
            if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A') {
                mostrarDetalleRegistro(item.idregistro,tipo);
            }
        });

        tbody.appendChild(tr);
    });
    break;

     case 'peatonal':
        datos.forEach(item => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            tr.dataset.id = item.idregistro;

            // Formatear fecha (igual que en vehicular)
            const fechaFormateada = new Date(item.fecha).toLocaleString('es-MX', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });

            // Icono dinámico (ENTRO/SALIO)
            const iconoAccion = item.accion === 'ENTRO' 
                ? '<i class="fas fa-sign-in-alt text-success"></i>' 
                : '<i class="fas fa-sign-out-alt text-danger"></i>';

            // Estructura PEATONAL (4 columnas: Hora, Nombre, Destino, Acciones)
            tr.innerHTML = `
                <td>${fechaFormateada}</td>
                <td>${item.nombre || 'N/A'}</td>
                <td>${item.destino || 'N/A'}</td>
                <td class="acciones">
                    ${iconoAccion} ${item.accion}
                </td>
            `;

            // Evento click para el modal (igual que vehicular)
            tr.addEventListener('click', (e) => {
                if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A') {
                    mostrarDetalleRegistro(item.idregistro, tipo);
                }
            });

            tbody.appendChild(tr);
        });
        break;

        case 'trabajadores':
    datos.forEach(item => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.dataset.id = item.idasiste;  // Usamos idasiste en lugar de idregistro

        // Formatear fecha (igual que en los otros casos)
        const fechaFormateada = new Date(item.fecha).toLocaleString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        // Icono dinámico (ENTRO/SALIO) y color de estado según f_baja
        const iconoAccion = item.accion === 'ENTRO' 
            ? '<i class="fas fa-sign-in-alt text-success"></i>' 
            : '<i class="fas fa-sign-out-alt text-danger"></i>';

        // Verificar si está de baja (f_baja en el futuro = activo)
        const estaActivo = item.f_baja ? new Date(item.f_baja) > new Date() : true;
        const badgeEstado = estaActivo 
            ? '<span class="badge bg-success">Activo</span>' 
            : '<span class="badge bg-secondary">Baja</span>';

        // Estructura TRABAJADORES (4 columnas: Hora, Nombre, Destino, Acciones)
        tr.innerHTML = `
            <td>${fechaFormateada}</td>
            <td>
                ${item.nombre || 'N/A'}
                <br><small class="text-muted">${item.oficio || 'N/A'}</small>
                ${!estaActivo ? '<br>' + badgeEstado : ''}
            </td>
            <td>${item.destino || 'N/A'}</td>
            <td class="acciones">
                ${iconoAccion} ${item.accion}
            </td>
        `;

        // Evento click para el modal
        tr.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A') {
                mostrarDetalleRegistro(item.idasiste, tipo);  // Pasamos idasiste
            }
        });

        tbody.appendChild(tr);
    });
    break;

    case 'residentes':
    datos.forEach(item => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.dataset.id = item.idasiste;  // Usamos idasiste como identificador

        // Formatear fecha (igual que en los otros casos)
        const fechaFormateada = new Date(item.fecha).toLocaleString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        // Icono dinámico (ENTRO/SALIO)
        const iconoAccion = item.accion === 'ENTRO' 
            ? '<i class="fas fa-sign-in-alt text-success"></i>' 
            : '<i class="fas fa-sign-out-alt text-danger"></i>';

        // Estructura RESIDENTES (6 columnas: Hora, Vehículo, Placa, Residente, Destino, Acciones)
        tr.innerHTML = `
            <td>${fechaFormateada}</td>
            <td>${item.auto || 'N/A'}</td>
            <td>${item.placa || 'N/A'}</td>
            <td>${item.nombre || 'N/A'}</td>
            <td>${item.destino || 'N/A'}</td>
            <td class="acciones">
                ${iconoAccion} ${item.accion}
            </td>
        `;

        // Evento click para el modal
        tr.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A') {
                mostrarDetalleRegistro(item.idasiste, tipo);
            }
        });

        tbody.appendChild(tr);
    });
    break;

}
filtrarReportes();
}

// Función de ejemplo para mostrar detalles (puedes personalizarla)
function mostrarDetalleRegistro(id,tipo) {
    // Verificar si hay datos en cache
    if (!cacheReportes) {
        Swal.fire({
            title: 'Datos no disponibles',
            text: 'Los datos han expirado, por favor recarga el reporte',
            icon: 'warning'
        });
        return;
    }
    
    var registro;
     if (tipo === 'trabajadores' || tipo === 'residentes') {
        registro = cacheReportes.find(r => r.idasiste === id);
    }
    else
    {
        registro = cacheReportes.find(item => item.idregistro === id);
    }

    if (!registro) {
        Swal.fire({
            title: 'No encontrado',
            text: 'El registro no existe en los datos cargados',
            icon: 'error'
        });
        return;
    }
    
    // Formatear fecha chida (igual que antes)
    const fechaFormateada = new Date(registro.fecha).toLocaleString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
    
    var htmlContent;

    switch (tipo)
    {

    case 'vehicular':
    // Aquí va tu HTML perrón (el mismo que ya teníamos)
     htmlContent= `
            <div class="detalle-registro">
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>📅 Fecha:</strong> ${fechaFormateada}</p>
                        <p><strong>🚗 Acción:</strong> ${registro.accion === 'ENTRO' ? 'Entrada 🟢' : 'Salida 🔴'}</p>
                        <p><strong>🪪 Gafete:</strong> ${registro.gafete|| 'N/A'}</p>
                        <p><strong>👮 Vigilante:</strong> ${registro.vigilante || 'N/A'}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>🚘 Vehículo:</strong></p>
                        <p>Placa: ${registro.placa || 'N/A'}</p>
                        <p>Tipo: ${registro.tipo || 'N/A'}</p>
                        <p>Marca: ${registro.marca || 'N/A'}</p>
                        <p>Color: ${registro.color || 'N/A'}</p>
                    </div>
                </div>
                
                <hr>
                
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>👤 Conductor:</strong> ${registro.conductor || 'N/A'}</p>
                        <p><strong>🎯 Destino:</strong> ${registro.destino || 'N/A'}</p>
                        <p><strong>📌 Ingreso por:</strong> ${registro.ingreso || 'N/A'}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>📝 Motivo:</strong> ${registro.motivo || 'N/A'}</p>
                        <p><strong>👥 Ocupantes:</strong> ${registro.ocupantes || '0'}</p>
                        <p><strong>📋 Nota:</strong> ${registro.nota || 'N/A'}</p>
                    </div>
                </div>
                
                ${registro.nota ? `<hr><p><strong>📄 Notas adicionales:</strong></p><p>${registro.nota}</p>` : ''}
            </div>
            
            <style>
                .detalle-registro {
                    font-size: 16px;
                }
                .detalle-registro .row {
                    margin-bottom: 10px;
                }
                .detalle-registro strong {
                    color: #444;
                }
                .detalle-registro hr {
                    margin: 10px 0;
                    border-color: #eee;
                }
            </style>
        `;
        break;

        case 'peatonal':
    htmlContent = `
        <div class="detalle-registro">
            <div class="row">
                <div class="col-md-6">
                    <p><strong>📅 Fecha:</strong> ${fechaFormateada}</p>
                    <p><strong>🚶 Acción:</strong> ${registro.accion === 'ENTRO' ? 'Entrada 🟢' : 'Salida 🔴'}</p>
                    <p><strong>👤 Nombre:</strong> ${registro.nombre || 'N/A'}</p>
                    <p><strong>🎯 Destino:</strong> ${registro.destino || 'N/A'}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>👮 Vigilante:</strong> ${registro.vigilante || 'N/A'}</p>
                    <p><strong>🚪 Ingreso por:</strong> ${registro.ingreso || 'N/A'}</p>
                    <p><strong>📌 Motivo:</strong> ${registro.motivo || 'N/A'}</p>
                    <p><strong>🪪 Gafete:</strong> ${registro.gafete || 'N/A'}</p>
                </div>
            </div>
            
            <hr>
            
            <div class="row">
                <div class="col-12">
                    <p><strong>📝 Nota:</strong> ${registro.nota || 'Sin notas adicionales'}</p>
                </div>
            </div>
            
            ${registro.nota ? `<hr><p><strong>📄 Detalles:</strong></p><p>${registro.nota}</p>` : ''}
        </div>
        
        <style>
            .detalle-registro {
                font-size: 16px;
            }
            .detalle-registro .row {
                margin-bottom: 10px;
            }
            .detalle-registro strong {
                color: #444;
            }
            .detalle-registro hr {
                margin: 10px 0;
                border-color: #eee;
            }
        </style>
    `;
    break;

    case 'trabajadores':
    // Formatear fecha de baja (si existe)
    const fechaBajaFormateada = registro.f_baja 
        ? new Date(registro.f_baja).toLocaleString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })
        : 'N/A';

    // Determinar estado
    const estaActivo = registro.f_baja ? new Date(registro.f_baja) > new Date() : true;
    const badgeEstado = estaActivo 
        ? '<span class="badge bg-success">Activo</span>' 
        : '<span class="badge bg-secondary">Baja</span>';

    htmlContent = `
        <div class="detalle-registro">
            <div class="row">
                <div class="col-md-6">
                    <p><strong>📅 Fecha:</strong> ${fechaFormateada}</p>
                    <p><strong>🛠️ Acción:</strong> ${registro.accion === 'ENTRO' ? 'Entrada 🟢' : 'Salida 🔴'}</p>
                    <p><strong>👷 Nombre:</strong> ${registro.nombre || 'N/A'}</p>
                    <p><strong>🏢 Oficio:</strong> ${registro.oficio || 'N/A'}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>🏷️ Tag/ID:</strong> ${registro.tag || 'N/A'}</p>
                    <p><strong>📌 Estado:</strong> ${badgeEstado}</p>
                    <p><strong>📅 Fecha de baja:</strong> ${fechaBajaFormateada}</p>
                    <p><strong>🚪 Ingreso por:</strong> ${registro.ingreso || 'N/A'}</p>
                </div>
            </div>
            
            <hr>
            
            <div class="row">
                <div class="col-md-6">
                    <p><strong>🎯 Destino:</strong> ${registro.destino || 'N/A'}</p>
                </div>
                <div class="col-md-6">
                    <!-- Espacio para futuros campos -->
                </div>
            </div>
            
            ${registro.nota ? `
                <hr>
                <div class="row">
                    <div class="col-12">
                        <p><strong>📝 Notas:</strong></p>
                        <p>${registro.nota}</p>
                    </div>
                </div>
            ` : ''}
        </div>
        
        <style>
            .detalle-registro {
                font-size: 16px;
            }
            .detalle-registro .row {
                margin-bottom: 10px;
            }
            .detalle-registro strong {
                color: #444;
            }
            .detalle-registro hr {
                margin: 10px 0;
                border-color: #eee;
            }
            .badge {
                padding: 3px 8px;
                border-radius: 12px;
                font-size: 0.85em;
            }
            .bg-success {
                background-color: #28a745 !important;
            }
            .bg-secondary {
                background-color: #6c757d !important;
            }
        </style>
    `;
    break;

    case 'residentes':
    htmlContent = `
        <div class="detalle-registro">
            <div class="row">
                <div class="col-md-6">
                    <p><strong>📅 Fecha:</strong> ${fechaFormateada}</p>
                    <p><strong>🚗 Acción:</strong> ${registro.accion === 'ENTRO' ? 'Entrada 🟢' : 'Salida 🔴'}</p>
                    <p><strong>👤 Nombre:</strong> ${registro.nombre || 'N/A'}</p>
                    <p><strong>🏠 Destino:</strong> ${registro.destino || 'N/A'}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>🚘 Vehículo:</strong> ${registro.auto || 'N/A'}</p>
                    <p><strong>🔢 Placa:</strong> ${registro.placa || 'N/A'}</p>
                    <p><strong>🏷️ Tag:</strong> ${registro.tag || 'N/A'}</p>
                    <p><strong>🚪 Ingreso por:</strong> ${registro.ingreso || 'N/A'}</p>
                </div>
            </div>
            
            <hr>
            
            ${registro.nota ? `<hr><p><strong>📄 Notas adicionales:</strong></p><p>${registro.nota}</p>` : ''}
        </div>
        
        <style>
            .detalle-registro {
                font-size: 16px;
            }
            .detalle-registro .row {
                margin-bottom: 10px;
            }
            .detalle-registro strong {
                color: #444;
            }
            .detalle-registro hr {
                margin: 10px 0;
                border-color: #eee;
            }
        </style>
    `;
    break;

    }
    Swal.fire({
        title: `Detalles`,
        html: htmlContent,
        width: '700px',
        confirmButtonText: 'Cerrar',
        icon: 'info'
    });
}

function configurarEncabezados(tipo) {
  const tituloReporte = document.getElementById('titulo-reporte');
  const thead = document.querySelector('#tabla-reportes thead tr');

  switch (tipo) {
    case 'vehicular':
      thead.innerHTML = `
        <th>Hora</th>
        <th>Placa/Gafete</th>
        <th>Nombre</th>
        <th>Destino</th>
        <th>Acciones</th>
      `;
      break;
    
    case 'peatonal':
      thead.innerHTML = `
        <th>Hora</th>
        <th>Nombre</th>
        <th>Destino</th>
        <th>Acciones</th>
      `;
      break;
    
      case 'trabajadores':
      thead.innerHTML = `
        <th>Hora</th>
        <th>Nombre</th>
        <th>Destino</th>
        <th>Acciones</th>
      `;
      break;

    case 'residentes':
      thead.innerHTML = `
        <th>Hora</th>
        <th>Vehículo</th>
        <th>Placa</th>
        <th>Residente</th>
        <th>Destino</th>
        <th>Acciones</th>
      `;
      break;

      
    
    default:
      thead.innerHTML = `
        <th>Columna 1</th>
        <th>Columna 2</th>
        <th>Columna 3</th>
        <th>Columna 4</th>
        <th>Acciones</th>
      `;
  }
}

function exportarAExcel() {
    console.log('Exportando a Excel...');
    // Lógica usando la librería xlsx
}

function filtrarReportes() {
    const input = document.getElementById('filtro-reportes');
    const tabla = document.getElementById('tabla-reportes');
    const filas = tabla.querySelectorAll('tbody tr');

    input.addEventListener('input', () => {
        const texto = input.value.toLowerCase();
        
        filas.forEach(fila => {
            const celdas = fila.querySelectorAll('td');
            let coincide = false;
            
            celdas.forEach(celda => {
                if (celda.textContent.toLowerCase().includes(texto)) {
                    coincide = true;
                }
            });
            
            fila.style.display = coincide ? '' : 'none';
        });
    });
}
