// components/detalle-domicilio.js

//const BACKEND_HOST = 'http://localhost:3000';

//const BACKEND_HOST = 'https://sincronizapkbackend.onrender.com';
// Nuevo: tomar la URL desde config.js o fallback
const BACKEND_HOST = window.BACKEND_HOST;


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

// async function cargarTodoEnUnSoloFetch(idCasa) {
//     mostrarLoader(true);

//     try {
//         // 1️⃣ Definir TODOS los queries (incluyendo el de la casa)
//         const queries = [
//             { 
//                 key: 'domicilio', 
//                 sql: `
//                     SELECT 
//                         c.*,
//                         con.concepto AS nombre_categoria,
//                         d.nombre AS nombre_caseta
//                     FROM 
//                         casas c
//                     LEFT JOIN 
//                         conceptos con ON c.categoria = con.idconcepto
//                     LEFT JOIN 
//                         dispositivo d ON c.caseta = d.iddispositivo
//                     WHERE 
//                         c.idcasa = '${idCasa}' AND c.activo = 1;
//                 `
//             },
//             { key: 'categorias', sql: `SELECT * FROM conceptos WHERE activo = 1 AND tipo = 2 ORDER BY concepto` },
//             { key: 'caseta', sql: `SELECT * FROM dispositivo WHERE tipo = 2 ORDER BY nombre` },
//             { key: 'residentes', sql: `SELECT * FROM residentes WHERE activo = 1 AND idcasa = '${idCasa}' ORDER BY nombre` },
//             { key: 'trabajadores', sql: `SELECT * FROM trabajadores WHERE activo = 1 AND idcasa = '${idCasa}' ORDER BY nombre` },
//             { key: 'oficios', sql: `SELECT * FROM conceptos WHERE tipo = 1 AND activo = 1 ORDER BY concepto` },
//             { key: 'idfoto3', sql: `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'trabajadores' AND COLUMN_NAME = 'idfoto3';` },
//         ];

//         // 2️⃣ Hacer el batch fetch
//         const response = await fetch(`${BACKEND_HOST}/api/search/batch?queries=${encodeURIComponent(JSON.stringify(queries))}`);
//         if (!response.ok) throw new Error('Error en la respuesta del servidor');
        
//         const result = await response.json();
//         //console.log("🔥 Respuesta batch completa:", result);

//         if (!result.success) throw new Error('Error general en el batch');

        

//         // 4️⃣ Procesar el resto de los datos (categorías, residentes, etc.)
//         Object.entries(result.data).forEach(([key, subResponse]) => {
//             if (key === 'domicilio') return; // Ya lo procesamos
            
//             if (!subResponse.success) {
//                 console.warn(`❌ ${key} falló:`, subResponse);
//                 return;
//             }

//             switch (key) {
//                 case 'categorias':
//                     llenarComboCategorias(subResponse.data);
//                     break;
//                 case 'caseta':
//                     llenarComboCasetas(subResponse.data);
//                     break;
//                 case 'residentes':
//                     llenarTablaResidentes(subResponse.data);
//                     // 🔥 Guardamos en cache!
//                     cacheResidentes={};
//                     cacheResidentes = subResponse.data;
//                     break;
//                 case 'trabajadores':
//                     llenarTablaTrabajadores(subResponse.data);
//                     cacheTrabajadores={};
//                     cacheTrabajadores=subResponse.data;
//                     break;
//                 case 'oficios':
//                     cacheOficios={};
//                     cacheOficios=subResponse.data;
//                     //llenarComboOficios(subResponse.data);
//                     break;
//             }
//         });

//          // 🔥 NUEVO: Procesar la verificación de idfoto3 AQUÍ
//         if (result.data.idfoto3?.success) {
//             // Si hay datos en la respuesta, significa que la columna existe
//             soportaFoto = result.data.idfoto3.data.length > 0;
            
//             // console.log(`✅ Verificación batch - idfoto3: ${soportaFoto ? 'EXISTE' : 'NO EXISTE'}`);
//             // console.log(`📊 Resultado idfoto3:`, result.data.idfoto3);
            
//         } else {
//             //console.warn('⚠️ No se pudo verificar idfoto3, usando valor por defecto (false)');
//             soportaFoto = false;
//         }


//         // 3️⃣ Procesar datos de la casa PRIMERO (si existe)
//         if (result.data.domicilio?.success && result.data.domicilio.data.length > 0) {
//             const casa = result.data.domicilio.data[0];
            
//             // Llenar campos principales
//             document.getElementById('direccion').value = casa.direccion || '  ';
//             document.getElementById('lote').value = casa.lote || '  ';
//             document.getElementById('restriccion').value = casa.restriccion || '  ';
//             document.getElementById('contrato').value = casa.contrato || '0';
//             document.getElementById('telefono').value = casa.tel || '';
            
//             idCasetacache = casa.caseta;
//             document.getElementById('fecha-cuota').value = casa.fechacuota ? casa.fechacuota.split('T')[0] : '2050-01-01';
            
//             // Seleccionar categoría y caseta (usando los nombres si existen)
//             document.getElementById('categoria').value = casa.categoria || '';
//             document.getElementById('caseta').value = casa.caseta || '';
            
//             // Checkboxes
//             document.getElementById('permiso-residentes').checked = casa.picol === 1;
//             document.getElementById('permiso-trabajadores').checked = casa.pitra === 1;
//         } else {
//             throw new Error('Domicilio no encontrado');
//         }

//         // 5️⃣ Guardar valores iniciales
//         valoresIniciales = obtenerDatosFormulario();

//     } catch (error) {
//         console.error("🔥 ERROR crítico:", error);
//         alert(error.message.includes('Domicilio') 
//             ? '❌ Domicilio no existe. Regresa a la búsqueda.' 
//             : '⚠️ Error al cargar datos. Recarga la página.');
//         if (error.message.includes('Domicilio')) window.location.href = "/buscar.html";
//     } finally {
//         mostrarLoader(false);
//     }
// }

async function cargarTodoEnUnSoloFetch(idCasa) {
    mostrarLoader(true);

    try {
        // 1️⃣ Definir TODOS los queries (incluyendo el de la casa)
        const queries = [
            { 
                key: 'domicilio', 
                sql: `
                    SELECT 
                        c.*,
                        con.concepto AS nombre_categoria,
                        d.nombre AS nombre_caseta
                    FROM 
                        casas c
                    LEFT JOIN 
                        conceptos con ON c.categoria = con.idconcepto
                    LEFT JOIN 
                        dispositivo d ON c.caseta = d.iddispositivo
                    WHERE 
                        c.idcasa = '${idCasa}' AND c.activo = 1;
                `
            },
            { key: 'categorias', sql: `SELECT * FROM conceptos WHERE activo = 1 AND tipo = 2 ORDER BY concepto` },
            { key: 'caseta', sql: `SELECT * FROM dispositivo WHERE tipo = 2 ORDER BY nombre` },
            { key: 'residentes', sql: `SELECT * FROM residentes WHERE activo = 1 AND idcasa = '${idCasa}' ORDER BY nombre` },
            { key: 'trabajadores', sql: `SELECT * FROM trabajadores WHERE activo = 1 AND idcasa = '${idCasa}' ORDER BY nombre` },
            { key: 'oficios', sql: `SELECT * FROM conceptos WHERE tipo = 1 AND activo = 1 ORDER BY concepto` },
            { key: 'idfoto3', sql: `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'trabajadores' AND COLUMN_NAME = 'idfoto3';` },
        ];

        // 2️⃣ Hacer el batch fetch con POST
        const response = await fetch(`${BACKEND_HOST}/api/search/batch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ queries: queries })
        });
        
        if (!response.ok) throw new Error('Error en la respuesta del servidor');
        
        const result = await response.json();

        if (!result.success) throw new Error('Error general en el batch');

        // 3️⃣ Procesar datos de la casa PRIMERO (si existe)
        if (result.data.domicilio?.success && result.data.domicilio.data.length > 0) {
            const casa = result.data.domicilio.data[0];
            
            // Llenar campos principales
            document.getElementById('direccion').value = casa.direccion || '  ';
            document.getElementById('lote').value = casa.lote || '  ';
            document.getElementById('restriccion').value = casa.restriccion || '  ';
            document.getElementById('contrato').value = casa.contrato || '0';
            document.getElementById('telefono').value = casa.tel || '';
            
            idCasetacache = casa.caseta;
            document.getElementById('fecha-cuota').value = casa.fechacuota ? casa.fechacuota.split('T')[0] : '2050-01-01';
            
            // Seleccionar categoría y caseta (usando los nombres si existen)
            document.getElementById('categoria').value = casa.categoria || '';
            document.getElementById('caseta').value = casa.caseta || '';
            
            // Checkboxes
            document.getElementById('permiso-residentes').checked = casa.picol === 1;
            document.getElementById('permiso-trabajadores').checked = casa.pitra === 1;
        } else {
            throw new Error('Domicilio no encontrado');
        }

        // 4️⃣ Procesar el resto de los datos (categorías, residentes, etc.)
        Object.entries(result.data).forEach(([key, subResponse]) => {
            if (key === 'domicilio') return; // Ya lo procesamos
            
            if (!subResponse.success) {
                console.warn(`❌ ${key} falló:`, subResponse);
                return;
            }

            switch (key) {
                case 'categorias':
                    llenarComboCategorias(subResponse.data);
                    break;
                case 'caseta':
                    llenarComboCasetas(subResponse.data);
                    break;
                case 'residentes':
                    llenarTablaResidentes(subResponse.data);
                    cacheResidentes = subResponse.data;
                    break;
                case 'trabajadores':
                    llenarTablaTrabajadores(subResponse.data);
                    cacheTrabajadores = subResponse.data;
                    break;
                case 'oficios':
                    cacheOficios = subResponse.data;
                    break;
            }
        });

        // 5️⃣ Procesar la verificación de idfoto3
        if (result.data.idfoto3?.success) {
            soportaFoto = result.data.idfoto3.data.length > 0;
        } else {
            soportaFoto = false;
        }

        // 6️⃣ Guardar valores iniciales
        valoresIniciales = obtenerDatosFormulario();

    } catch (error) {
        console.error("🔥 ERROR crítico:", error);
        alert(error.message.includes('Domicilio') 
            ? '❌ Domicilio no existe. Regresa a la búsqueda.' 
            : '⚠️ Error al cargar datos. Recarga la página.');
        if (error.message.includes('Domicilio')) window.location.href = "/buscar.html";
    } finally {
        mostrarLoader(false);
    }
}

async function cargarCategorias() {
    try {  
        const response = await fetch(`${BACKEND_HOST}/api/search/categorias`);
        if (!response.ok) throw new Error('Error en la respuesta del servidor');
        
        const { success, data } = await response.json();
        if (!success) throw new Error('Error en los datos recibidos');

        llenarComboCategorias(data); // Directo al combo, sin cache
    } catch (error) {
        console.error('🔥 ERROR EN cargarCategorias:', {
            error: error.message,
            url: `${BACKEND_HOST}/api/search/categorias`,
            status: response?.status,
            backendData: await safeParseError(response), // Parsea el error sin crashear
        });

        document.getElementById('categoria').innerHTML = `
            <option value="">Error al cargar categorías</option>
        `;
    }
}

let cacheOficios = [];// Objetos para guardar los oficios

async function cargarOficios() {
    try {  
        const response = await fetch(`${BACKEND_HOST}/api/search/oficios`);
        if (!response.ok) throw new Error('Error en la respuesta del servidor');
        
        const { success, data } = await response.json();
        if (!success) throw new Error('Error en los datos recibidos');

        // 🔥 Guardamos en la variable global
        cacheOficios = {};
        cacheOficios = data;
        //console.log("Oficios cargados:", cacheOficios); // Para debuggear

    } catch (error) {
        console.error('Error cargando oficios:', error);
        // Opcional: Mostrar error en UI si es crítico
    }
}

async function cargarCasetas() {
    try {
        const response = await fetch(`${BACKEND_HOST}/api/search/casetas`);
        if (!response.ok) throw new Error('Error en la respuesta del servidor');
        
        const { success, data } = await response.json();
        if (!success) throw new Error('Error en los datos recibidos');

        llenarComboCasetas(data); // Sin cache, pura data fresca
    } catch (error) {
        console.error('🔥 ERROR EN cargarCasetas:', {
            error: error.message,
            url: `${BACKEND_HOST}/api/search/casetas`,
            status: response?.status,
            stack: error.stack, // 👀 Pila de llamadas (útil para bugs raros)
        });

        document.getElementById('caseta').innerHTML = `
            <option value="">Error al cargar casetas</option>
        `;
    }
}

// Variable global (asegúrate de que esté declarada antes)
let soportaFoto = false;


// ========== FUNCIONES AUXILIARES ========== //
function llenarComboCategorias(data) {
    const select = document.getElementById('categoria');
    select.innerHTML = data.map(cat => 
        `<option value="${cat.idconcepto}">${cat.concepto.trim()}</option>`
    ).join('');
}

function llenarComboCasetas(data) {
    const select = document.getElementById('caseta');
    select.innerHTML = data.map(caseta => 
        `<option value="${caseta.iddispositivo}">${caseta.nombre.trim()}</option>`
    ).join('');
}

function llenarTablaResidentes(data) {
    const tbody = document.getElementById('residentes-list');
    tbody.innerHTML = data.map(residente => `
        <tr data-id="${residente.idresidente}" data-tipo="residente">
            <td>${residente.nombre?.trim() || '  '}</td>
            <td>${residente.auto?.trim() || '  '}</td>
            <td>${residente.placa?.trim() || '  '}</td>
            <td>${residente.passw || '0'}</td>
        </tr>
    `).join('');
}

function llenarTablaTrabajadores(data) {
    const tbody = document.getElementById('trabajadores-list');
    tbody.innerHTML = data.map(trabajador => `
        <tr data-id="${trabajador.idtrabajador}" data-tipo="trabajador">
            <td>${trabajador.nombre?.trim() || '  '}</td>
            <td>${trabajador.nombre_oficio?.trim() || '  '}</td>
            <td>${trabajador.f_baja ? new Date(trabajador.f_baja).toLocaleDateString('es-MX') : '  '}</td>
            <td>${trabajador.passw || '0'}</td>
        </tr>
    `).join('');
}

// === CACHE DE DATOS ===
let cacheResidentes = {}; // Objeto para guardar residentes por IDcasa
let cacheTrabajadores = {}; // Objeto para guardar residentes por IDcasa


async function cargarResidentes(idCasa) {
    try {
        const response = await fetch(`${BACKEND_HOST}/api/search/residentescasa?query=${idCasa}`);
        if (!response.ok) throw new Error('Error en la respuesta del servidor');
        
        const result = await response.json(); // Cambio clave aquí
        //console.log("Respuesta del backend:", result); // 👈 Verifica la estructura aquí
        if (!result.success) throw new Error('Error en los datos recibidos');
        
        // 🔥 Guardamos en cache!
        cacheResidentes={};
        cacheResidentes = result.data;
        //console.log(cacheResidentes);

        const tbody = document.getElementById('residentes-list');
        tbody.innerHTML = result.data.map(residente => `
            <tr data-id="${residente.idresidente}" data-tipo="residente">
                <td>${residente.nombre || '  '}</td>
                <td>${residente.auto || '  '}</td>
                <td>${residente.placa || '  '}</td>
                <td>${residente.passw || '0'}</td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('🔥 ERROR EN cargarResidentes:', {
            error: error.message,
            url: `${BACKEND_HOST}/api/search/residentescasa?query=${idCasa}`,
            status: response?.status,  // Status HTTP (si hay response)
            statusText: response?.statusText,
            backendError: await getErrorBody(response), // 👀 Ver cuerpo del error
        });

        document.getElementById('residentes-list').innerHTML = `
            <tr><td colspan="4" class="error">⚠️ Error al cargar residentes</td></tr>
        `;
    }
}

async function cargarTrabajadores(idCasa) {
    try {
        const response = await fetch(`${BACKEND_HOST}/api/search/trabajadorescasa?query=${idCasa}`);
        if (!response.ok) throw new Error('Error en la respuesta del servidor');
        
        const result = await response.json(); // Cambio clave aquí
        if (!result.success) throw new Error('Error en los datos recibidos');

          // 🔥 Guardamos en cache!
        cacheTrabajadores={};
        cacheTrabajadores = result.data;
        //console.log(cacheTrabajadores);

        const tbody = document.getElementById('trabajadores-list');
        tbody.innerHTML = result.data.map(trabajador => `
            <tr data-id="${trabajador.idtrabajador}" data-tipo="trabajador">
                <td>${trabajador.nombre || '  '}</td>
                <td>${trabajador.nombre_oficio || '  '}</td>
                <td>${trabajador.f_baja ? new Date(trabajador.f_baja).toLocaleDateString('es-MX') : '  '}</td>
                <td>${trabajador.passw || '0'}</td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('🔥 ERROR EN cargarTrabajadores:', {
        error: error.message, // Mensaje de error
        response: error.response, // Si usa Axios (si no, ignora)
        url: `${BACKEND_HOST}/api/search/trabajadorescasa?query=${idCasa}`,
        status: response?.status, // Agrega esto ANTES del json()
        statusText: response?.statusText,
        });

        // Si quieres ver el cuerpo del error (aunque sea un 500)
        try {
            const errorBody = await response.clone().json(); // Clonar para no consumir el stream
            //console.log('📌 Cuerpo del error:', errorBody);
        } catch (e) {
            //console.log('📌 El servidor no devolvió JSON válido en el error');
        }
    
        console.error('Error cargando trabajadores:', error);
        document.getElementById('trabajadores-list').innerHTML = `
            <tr><td colspan="3" class="error">⚠️ Error al cargar trabajadores</td></tr>
        `;
    }
}

// ========== PANTALLA DE CARGA ========== //
function mostrarLoader(mostrar) {
    const loader = document.getElementById('loader');
    const contenido = document.getElementById('contenido-principal');
    
    if (mostrar) {
        loader.style.display = 'flex';
        contenido.style.display = 'none';
    } else {
        loader.style.display = 'none';
        contenido.style.display = 'block';
    }
}

let idCasacache;
let idCasetacache;

// 1. Variables para control de cambios
let valoresIniciales = {};
let haCambiado = false;

// ========== CARGA PRINCIPAL ========== //
async function cargarDomicilioCompleto() {
    mostrarLoader(true);
    
    filtrarTabla('buscar-residente', 'residentes-list');
    filtrarTabla('buscar-trabajador', 'trabajadores-list');
    
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const idCasa = urlParams.get('id');
        idCasacache = idCasa;
        if (!idCasa) throw new Error('ID de casa no proporcionado');

        // Cargar datos en paralelo
        await Promise.allSettled([
            await cargarTodoEnUnSoloFetch(idCasacache)
        ]);

        // // Cargar datos de la casa
        // const response = await fetch(`${BACKEND_HOST}/api/search/idcasa?query=${idCasa}`);
        // if (!response.ok) throw new Error('Error en la respuesta del servidor');
        
        // const { success, data } = await response.json();
        // if (!success || !data.length) throw new Error('Domicilio no encontrado');

        // const casa = data[0];
        

        // // Llenar campos
        // document.getElementById('direccion').value = casa.direccion || '  ';
        // document.getElementById('lote').value = casa.lote || '  ';
        // document.getElementById('restriccion').value = casa.restriccion || '  ';
        // document.getElementById('contrato').value = casa.contrato || '0';
        // document.getElementById('telefono').value = casa.tel || '';
        
        // idCasetacache = casa.caseta;
        
        // const fechaCuota = casa.fechacuota ? casa.fechacuota.split('T')[0] : '2050-01-01';
        // document.getElementById('fecha-cuota').value = fechaCuota;

        // // Seleccionar categoría y caseta
        // const selectCategoria = document.getElementById('categoria');
        // const selectCaseta = document.getElementById('caseta');
        
        // selectCategoria.value = casa.categoria || '';
        // selectCaseta.value = casa.caseta || '';

        // // Checkboxes
        // document.getElementById('permiso-residentes').checked = casa.picol === 1;
        // document.getElementById('permiso-trabajadores').checked = casa.pitra === 1;

        // valoresIniciales = obtenerDatosFormulario();

    } catch (error) {
        console.error('Error crítico:', error);
        alert('⚠️ Error al cargar el domicilio. Por favor recarga la página.');
    } finally {
        mostrarLoader(false);
    }
}


// === FUNCIÓN PARA MANEJAR EL CLICK EN FILAS (VERSIÓN PRO) ===
document.querySelector('.main-content').addEventListener('click', (e) => {
    const fila = e.target.closest('tr[data-id]');
    if (!fila) return;

    const id = fila.getAttribute('data-id');
    const tipo = fila.closest('#residentes-list') ? 'residente' : 'trabajador'; // Identifica la tabla

    //console.log("Tipo:", tipo); // Debug
    if (tipo === 'trabajador') {
        abrirDetalleTrabajador(id);
    } else {
        abrirDetalleResidente(id);
    }
});


// Normaliza texto: mayúsculas, sin acentos, ni caracteres raros
function normalizarTexto(texto) {
    return texto
        .normalize("NFD") // Separa acentos
        .replace(/[\u0300-\u036f]/g, "") // Elimina acentos
        .replace(/[^a-zA-Z0-9\s]/g, "") // Solo letras, números y espacios
        .toUpperCase();
}

// Normaliza placas: solo letras/números en mayúsculas
function normalizarPlaca(placa) {
    return placa
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "") // Elimina TODO lo que no sea alfanumérico
        .toUpperCase();
}

// === FUNCIÓN DE EJEMPLO PARA DETALLE DE TRABAJADOR ===
function abrirDetalleTrabajador(idTrabajador) {
    const trabajador = cacheTrabajadores.find(t => t.idtrabajador == idTrabajador);
    if (!trabajador) return;

    const fechaAlta = trabajador.f_alta ? new Date(trabajador.f_alta).toLocaleDateString('es-MX') : '  ';
    const fechaBaja = trabajador.f_baja ? new Date(trabajador.f_baja).toLocaleDateString('es-MX') : '  ';
    const fechaBajaInput = trabajador.f_baja ? trabajador.f_baja.split('T')[0] : '';
    const selectOficio = `
    <select id="selectOficio" class="form-control">
        ${cacheOficios.map(oficio => `
            <option value="${oficio.idconcepto}" ${trabajador.oficio == oficio.idconcepto ? 'selected' : ''}>
                ${oficio.concepto}
            </option>
        `).join('')}
    </select>
`;
    const diasSemana = [
    { id: 'L', nombre: 'Lunes', pos: 0 },
    { id: 'M', nombre: 'Martes', pos: 1 },
    { id: 'I', nombre: 'Miércoles', pos: 2 }, // "I" para evitar confusión con "M" (Martes)
    { id: 'J', nombre: 'Jueves', pos: 3 },
    { id: 'V', nombre: 'Viernes', pos: 4 },
    { id: 'S', nombre: 'Sábado', pos: 5 },
    { id: 'D', nombre: 'Domingo', pos: 6 }
    ];


    Swal.fire({
        title: `<small>DETALLE PEATÓN</small>`,
        html: `
            <div class="trabajador-grid">
                <!-- 🔥 Nombre completo (editable) -->
                <div class="campo-nombre">
                    <input type="text" value="${trabajador.nombre || '  '}" id="inputNombre" class="nombre-editable" placeholder="PATERNO MATERNO NOMBRE" maxlength="40">
                </div>

                <!-- Columna Izquierda -->
                <div class="columna">
                    <div class="campo">
                        <label>Oficio</label>
                        ${selectOficio}
                    </div>
                    <div class="campo">
                        <label>N° TAG</label>
                        <input type="number" value="${trabajador.passw || 0}" readonly id="inputTag">
                    </div>
                    <div class="campo">
                        <label>Fecha Alta</label>
                        <input type="text" value="${fechaAlta}" readonly>
                    </div>
                    <div class="campo-checkbox">
                        <label>
                            <input type="checkbox" id="checkDuerme" ${trabajador.duerme_domicilio ? 'checked' : ''}>
                            Duerme en el domicilio
                        </label>
                    </div>

                    <!-- 🔥 Sección de Datos Personales (expandible) -->
                <div class="campo-extra">
                    <details>
                        <summary>📝 Datos personales</summary>
                        <div class="subgrid">
                            <div class="campo">
                                <label>Calle</label>
                                <input type="text" value="${trabajador.calle || '  '}" id="inputCalle">
                            </div>
                            <div class="campo">
                                <label>Colonia</label>
                                <input type="text" value="${trabajador.colonia || '  '}" id="inputColonia">
                            </div>
                            <div class="campo">
                                <label>Teléfono</label>
                                <input type="tel" value="${trabajador.tel || '  '}" id="inputTelefono">
                            </div>
                            <div class="campo">
                                <label>C.P.</label>
                                <input type="text" value="${trabajador.cp || '  '}" id="inputCP">
                            </div>
                            <div class="campo">
                                <label>Encargado</label>
                                <input type="text" value="${trabajador.encargado || '  '}" id="inputEncargado">
                            </div>
                        </div>
                    </details>
                </div>

                </div>

                <!-- Columna Derecha -->
                <div class="columna">
                    <div class="campo">
                        <label>Estatus TAG</label>
                        <div class="radio-group-estatus">
                            <label class="radio-option">
                                <input type="radio" name="estatus" value="1" ${trabajador.pitra == 1 ? 'checked' : ''}>
                                <span class="radio-label activo">Activo</span>
                            </label>
                            <label class="radio-option">
                                <input type="radio" name="estatus" value="2" ${trabajador.pitra == 2 ? 'checked' : ''}>
                                <span class="radio-label mal-uso">Mal uso</span>
                            </label>
                            <label class="radio-option">
                                <input type="radio" name="estatus" value="3" ${trabajador.pitra == 3 ? 'checked' : ''}>
                                <span class="radio-label extravio">Extravío</span>
                            </label>
                            <label class="radio-option">
                                <input type="radio" name="estatus" value="4" ${trabajador.pitra == 4 ? 'checked' : ''}>
                                <span class="radio-label vencimiento">Vencimiento/Día</span>
                            </label>
                        </div>
                    </div>
                    <div class="campo-dias">
                        <label>ASISTE LOS DÍAS:</label>
                        <div class="checkbox-dias">
                            ${diasSemana.map(dia => {
                                const isChecked = trabajador.dias && trabajador.dias[dia.pos] === '1';
                                return `
                                    <label class="dia-option">
                                        <input type="checkbox" ${isChecked ? 'checked' : ''} data-dia="${dia.pos}">
                                        <span>${dia.id}</span>
                                    </label>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    <div class="campo">
                        <label>Fecha Baja</label>
                        
                        <input type="date" id="inputFechaBaja" value="${fechaBajaInput}">
                    </div>
                    <div class="campo">
                        <label>Observaciones</label>
                        <textarea id="textareaObs">${trabajador.obs || 'Sin observaciones'}</textarea>
                    </div>

                    
                    <div id="badgeFotoContainer" style="margin-top:10px; text-align:center;">
                        ${trabajador.idfoto3 > 0 
                            ? `<span class="badge-foto">📸 FOTO REGISTRADA</span>`
                            : `<span class="badge-no-foto">⚠️ SIN FOTO</span>`
                        }
                    </div>

                </div>

                
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        width: '800px',
        padding: '1.5rem',
        showDenyButton: true, // 👈 Activamos el botón de eliminar
        denyButtonText: 'Eliminar',
        denyButtonColor: '#d33', // Rojo para peligro
        preConfirm: () => {
            // 🔥 Validación 1: Nombre (mínimo 4 caracteres)
            const nombreInput = document.getElementById('inputNombre').value.trim();
            if (nombreInput.length < 4) {
                Swal.showValidationMessage("❌ El nombre debe tener al menos 4 caracteres");
                return false;
            }
            if (nombreInput.length > 40) {
                Swal.showValidationMessage("❌ El nombre no debe superar 40 caracteres");
                return false;
            }

            // 🔥 Validación 2: N° TAG (entre 0 y 16,777,215)
            const tagInput = document.getElementById('inputTag').value.trim();
            const tagNumber = parseInt(tagInput);
            if (isNaN(tagNumber)) {
                Swal.showValidationMessage("❌ El TAG debe ser un número válido");
                return false;
            }
            if (tagNumber < 0 || tagNumber > 16777215) {
                Swal.showValidationMessage("❌ El TAG debe estar entre 0 y 16,777,215");
                return false;
            }

            // 🔥 Validación 3: Oficio seleccionado (no vacío)
            const selectOficio = document.getElementById('selectOficio');
            if (!selectOficio || selectOficio.value === "") {
                Swal.showValidationMessage("❌ Selecciona un oficio para el trabajador");
                return false;
            }
            
            return {
                nombre: document.getElementById('inputNombre').value.trim().toUpperCase(),
                oficio: document.getElementById('selectOficio').value, 
                passw: document.getElementById('inputTag').value,
                duerme_domicilio: document.getElementById('checkDuerme').checked,
                estatus: document.querySelector('input[name="estatus"]:checked')?.value,
                f_baja: document.getElementById('inputFechaBaja').value,
                obs: document.getElementById('textareaObs').value.trim().toUpperCase(),
                calle: document.getElementById('inputCalle').value.trim().toUpperCase(),
                colonia: document.getElementById('inputColonia').value.trim().toUpperCase(),
                telefono: document.getElementById('inputTelefono').value.trim().toUpperCase(),
                cp: document.getElementById('inputCP').value.trim().toUpperCase(),
                encargado: document.getElementById('inputEncargado').value.trim().toUpperCase()
            };
        },
        customClass: {
            popup: 'trabajador-popup',
            title: 'trabajador-title',
            htmlContainer: 'trabajador-html'
        }
}).then(async (result) => {

    if (result.isDenied) {
            const confirmacion = await Swal.fire({
                title: '¿Eliminar trabajador?',
                text: "¡Esta acción no se puede deshacer!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar'
            });

            if (confirmacion.isConfirmed) {
                try {
                    // 🔥 FETCH para eliminar trabajador
                    const response = await fetch(`${BACKEND_HOST}/api/trabajador/eliminar`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            idtrabajador: idTrabajador,
                            passw: trabajador.passw || 0 // Enviar 0 si no tiene TAG
                        })
                    });
                    
                    const data = await response.json();

                    if (data.success) {
                        Swal.fire(
                            '¡Eliminado!', 
                            'El trabajador fue desactivado', 
                            'success'
                        );
                        
                            await cargarTrabajadores(trabajador.idcasa);

                    } else {
                        throw new Error(data.error || 'Error al eliminar');
                    }
                } catch (error) {
                    Swal.fire('Error', error.message, 'error');
                }
            }
        }


    else if (result.isConfirmed) {
        try {
            // 🔥 Preparar los datos para el endpoint
            const datosTrabajador = {
                idtrabajador: idTrabajador,
                nombre: result.value.nombre,
                idcasa: trabajador.idcasa || 0,
                pitra: parseInt(result.value.estatus) || 1,
                idfoto: trabajador.idfoto || 0,
                idfoto2: trabajador.idfoto2 || 0,
                obs: result.value.obs,
                passw: parseInt(result.value.passw) || 0,
                calle: result.value.calle,
                colonia: result.value.colonia,
                tel: result.value.telefono,
                cp: result.value.cp,
                encargado: result.value.encargado,
                oficio: parseInt(result.value.oficio),
                h24: trabajador.h24 || 0,
                dias: obtenerDiasSeleccionados(),
                f_baja: result.value.f_baja || null,
                idusuario: 1,
                casetalog: trabajador.grupo || 0
            };

            // 🛠️ Función para los días (sincrona, no necesita async)
            function obtenerDiasSeleccionados() {
                const diasArray = Array(7).fill('0');
                document.querySelectorAll('.checkbox-dias input[type="checkbox"]:checked').forEach(checkbox => {
                    const pos = parseInt(checkbox.getAttribute('data-dia'));
                    diasArray[pos] = '1';
                });
                return diasArray.join('');
            }

            // 🚀 FETCH al endpoint (versión async/await puro)
            const response = await fetch(`${BACKEND_HOST}/api/trabajador/guardar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosTrabajador)
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Error desconocido');
            }

            Swal.fire('¡Guardado!', 'Datos actualizados correctamente', 'success');
            await cargarTrabajadores(trabajador.idcasa); // Asegúrate de que esta función sea async
   
            
        } catch (error) {
            console.error('Error al guardar:', error);
            Swal.fire('Error', `No se pudo guardar: ${error.message}`, 'error');
        }
    }
});
}

function abrirDetalleResidente(idResidente) {
    const residente = cacheResidentes.find(r => r.idresidente == idResidente);
    if (!residente) return;

    const fechaAlta = residente.f_alta ? new Date(residente.f_alta).toLocaleDateString('es-MX') : '  ';

    Swal.fire({
        title: `<small>DETALLE VEHÍCULO</small>`,
        html: `
            <div class="residente-grid">
                <!-- Campo de NOMBRE EDITABLE (NUEVO) -->
                <div class="campo-nombre">
                    <input type="text" value="${residente.nombre}" id="inputNombre" class="nombre-editable" maxlength="40">
                </div>
                <!-- Columna Izquierda -->
                <div class="campo">
                    <label>Automóvil</label>
                    <input type="text" value="${residente.auto || ''}" id="inputAuto"> <!-- Quitamos readonly -->
                </div>
                <div class="campo">
                    <label>Placa</label>
                    <div class="placa-wrapper">
                        <input type="text" value="${residente.placa || '  '}" id="inputPlaca"> <!-- Quitamos readonly -->
                        <!--label class="checkbox-placa">
                            <input type="checkbox" id="checkPlacaOscura" ${residente.placa_oscura ? 'checked' : ''}> Fondo oscuro
                        </label-->
                    </div>
                </div>
                <div class="campo">
                    <label>Fecha Alta</label>
                    <input type="text" value="${fechaAlta}" readonly> <!-- Este SÍ sigue bloqueado -->
                </div>

                <!-- Columna Derecha -->
                <div class="campo">
                    <label>N° TAG</label>
                    <input type="text" value="${residente.passw || '0'}" id="inputTag" readonly> <!-- Quitamos readonly -->
                </div>
                <div class="campo">
                    <label>Observaciones</label>
                    <textarea id="textareaObs">${residente.obs || 'Sin observaciones'}</textarea> <!-- Quitamos readonly -->
                </div>
                <div class="campo-radio">
                    <label>Estado de acceso:</label>
                    <div class="radio-group" style="white-space: nowrap;"> <!-- ¡Fix para "extravío" en una línea! -->
                        <label><input type="radio" name="estado" ${residente.picol == 1 ? 'checked' : ''} value="1"> Permitir ingreso</label>
                        <label><input type="radio" name="estado" ${residente.picol == 2 ? 'checked' : ''} value="2"> Mal uso</label>
                        <label><input type="radio" name="estado" ${residente.picol == 3 ? 'checked' : ''} value="3"> Extravío</label>
                    </div>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        showDenyButton: true, // 👈 Botón adicional (Eliminar)
        denyButtonText: 'Eliminar',
        denyButtonColor: '#d33', // Rojo para peligro
        focusConfirm: false,
        width: '750px',
        didOpen: () => {
            // Aquí podrías agregar event listeners si necesitas validaciones extra
        },
        preConfirm: () => {
            // Lógica para guardar los cambios (ejemplo):
            // --- Normalización y validación ---
            // 1️⃣ NOMBRE (mínimo 4 caracteres, mayúsculas y sin acentos)
            const nombreInput = document.getElementById('inputNombre').value.trim();
            if (nombreInput.length < 4) {
                Swal.showValidationMessage("❌ El nombre debe tener al menos 4 caracteres");
                return false;
            }
            if (nombreInput.length > 40) {
                Swal.showValidationMessage("❌ El nombre no debe superar 40 caracteres");
                return false;
            }
            const nombreNormalizado = normalizarTexto(nombreInput);

            // 2️⃣ PLACA (mínimo 4 caracteres, mayúsculas, solo letras/números)
            const placaInput = document.getElementById('inputPlaca').value.trim();
            if (placaInput.length < 4) {
                Swal.showValidationMessage("❌ La placa debe tener al menos 4 caracteres");
                return false;
            }
            const placaNormalizada = normalizarPlaca(placaInput); // Limpia y convierte a mayúsculas

            // 3️⃣ TAG (número entero válido y dentro del rango)
            const tagInput = document.getElementById('inputTag').value.trim();
            const tagNumero = parseInt(tagInput);
            if (isNaN(tagNumero)) {
                Swal.showValidationMessage("❌ El TAG debe ser un número válido");
                return false;
            }
            if (tagNumero < 0 || tagNumero > 16777215) {
                Swal.showValidationMessage("❌ El TAG debe estar entre 0 y 16,777,215");
                return false;
            }

            // 4️⃣ AUTO y OBS (solo normalización, pueden estar vacíos)
            const autoNormalizado = normalizarTexto(document.getElementById('inputAuto').value);
            const obsNormalizada = normalizarTexto(document.getElementById('textareaObs').value);

            // --- Retornamos el objeto normalizado ---
            return {
                nombre: nombreNormalizado,
                auto: autoNormalizado,
                placa: placaNormalizada,
                placa_oscura: placaNormalizada.checked,
                passw: tagNumero,
                obs: obsNormalizada,
                picol: parseInt(document.querySelector('input[name="estado"]:checked').value),
                // Campos adicionales para el endpoint:
                idfoto: residente.idfoto,
                idcasa: residente.idcasa,          // <- Asegúrate de que esto esté disponible
                idusuario: 1,             // <- Ejemplo: ID del usuario logueado
                casetalog: residente.grupo                       // <- Ajusta según tu lógica
            };


            // return {
            //     nombre: document.getElementById('inputNombre').value,
            //     auto: document.getElementById('inputAuto').value,
            //     placa: document.getElementById('inputPlaca').value,
            //     placa_oscura: document.getElementById('checkPlacaOscura').checked,
            //     passw: document.getElementById('inputTag').value,
            //     obs: document.getElementById('textareaObs').value,
            //     picol: document.querySelector('input[name="estado"]:checked')?.value || residente.picol
            // };
        },
        customClass: {
            popup: 'residente-popup',
            title: 'residente-title',
            htmlContainer: 'residente-html',
            denyButton: 'swal2-deny-btn' // 👈 Clase CSS personalizada (opcional)
        }
    }).then(async (result) => {
        
        // 🔴 CASO 1: ELIMINAR
        if (result.isDenied) {
            const confirmacion = await Swal.fire({
                title: '¿Seguro que quieres ELIMINAR?',
                text: "¡No podrás revertir esto!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sí, bórralo',
                cancelButtonText: 'Cancelar'
            });

            if (confirmacion.isConfirmed) {
                try {
                    // 🔥 FETCH para eliminar
                    ///console.log(idResidente);
                    //console.log(residente.passw );
                    const response = await fetch(`${BACKEND_HOST}/api/residente/eliminar`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            idresidente: idResidente,
                            passw: residente.passw // 👈 Asegúrate de que residente.passw exista
                        })
                    });
                    const data = await response.json();

                    if (data.success) {
                        Swal.fire('¡Eliminado!', 'El residente se borró correctamente', 'success');
                        // Recargar datos o cerrar modal
                        if (typeof cargarResidentes === 'function') await cargarResidentes(residente.idcasa);
                    } else {
                        throw new Error(data.error || 'Error al eliminar');
                    }
                } catch (error) {
                    Swal.fire('Error', error.message, 'error');
                }
            }
        }

        else if (result.isConfirmed) {
            const datos = result.value;
            datos.idresidente = idResidente || 0;  // Si es 0, la función hace INSERT
            
            //console.log(datos);
            // 🔥 Mostrar loader mientras se guarda
            Swal.fire({
                title: 'Guardando...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            try {
                // Llamar al endpoint
                const response = await fetch(`${BACKEND_HOST}/api/residente/guardar`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datos)
                });
                const data = await response.json();

                if (data.success) {
                    Swal.fire('¡Guardado!', 'Los cambios se aplicaron correctamente', 'success');
                    // Recargar datos o actualizar la UI (ej: refrescar la tabla)
                    
                    if (typeof cargarResidentes === 'function') await cargarResidentes(residente.idcasa);
                } else {
                    throw new Error(data.error || 'Error al guardar');
                }
            } catch (error) {
                Swal.fire('Error', error.message, 'error');
            }
        }
    });
}

async function validarTag(tag) {
  try {
    const response = await fetch(`${BACKEND_HOST}/api/tags/validar?tag=${tag}`);
    const data = await response.json();
    return data.duplicado; // true o false
  } catch (error) {
    console.error("Error validando TAG:", error);
    return false; // Por defecto, no bloquear si hay error en la API
  }
}


function abrirNuevoResidente(idCasa) {
    Swal.fire({
        title: `<small>NUEVO VEHÍCULO</small>`,
        html: `
            <div class="residente-grid">
                <!-- Campo de NOMBRE EDITABLE -->
                <div class="campo-nombre">
                    <input type="text" placeholder="Ej. Juan Pérez" id="inputNombre" class="nombre-editable" maxlength="40">
                </div>
                <!-- Columna Izquierda -->
                <div class="campo">
                    <label>Automóvil</label>
                    <input type="text" placeholder="Ej. Toyota Corolla" id="inputAuto">
                </div>
                <div class="campo">
                    <label>Placa</label>
                    <div class="placa-wrapper">
                        <input type="text" placeholder="Ej. ABC123" id="inputPlaca">
                    </div>
                </div>
                <div class="campo">
                    <label>Fecha Alta</label>
                    <input type="text" value="${new Date().toLocaleDateString('es-MX')}" readonly>
                </div>

                <!-- Columna Derecha -->
                <div class="campo">
                    <label>N° TAG</label>
                    <input type="text" value="0" id="inputTag">
                </div>
                <div class="campo">
                    <label>Observaciones</label>
                    <textarea id="textareaObs" placeholder="Ej. Vehículo azul"></textarea>
                </div>
                <div class="campo-radio">
                    <label>Estado de acceso:</label>
                    <div class="radio-group">
                        <label><input type="radio" name="estado" checked value="1"> Permitir ingreso</label>
                        <label><input type="radio" name="estado" value="2"> Mal uso</label>
                        <label><input type="radio" name="estado" value="3"> Extravío</label>
                    </div>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        showDenyButton: false, // 👈 Sin botón de eliminar
        focusConfirm: false,
        width: '750px',
        didOpen: () => {
            // Puedes agregar lógica adicional si necesitas
        },
        preConfirm: async() => {
            // --- Validación (igual que en edición) ---
            const nombreInput = document.getElementById('inputNombre').value.trim();
            if (nombreInput.length < 4) {
                Swal.showValidationMessage("❌ El nombre debe tener al menos 4 caracteres");
                return false;
            }
            if (nombreInput.length > 40) {
                Swal.showValidationMessage("❌ El nombre no debe superar 40 caracteres");
                return false;
            }
            const nombreNormalizado = normalizarTexto(nombreInput);

            const placaInput = document.getElementById('inputPlaca').value.trim();
            if (placaInput.length < 4) {
                Swal.showValidationMessage("❌ La placa debe tener al menos 4 caracteres");
                return false;
            }
            const placaNormalizada = normalizarPlaca(placaInput);

            const tagInput = document.getElementById('inputTag').value.trim();
            const tagNumero = parseInt(tagInput);

            if (isNaN(tagNumero)) {
                Swal.showValidationMessage("❌ El TAG debe ser un número válido");
                return false;
            }
            if (tagNumero < 0 || tagNumero > 16777215) {
                Swal.showValidationMessage("❌ El TAG debe estar entre 0 y 16,777,215");
                return false;
            }

            // 🔥🔥🔥 NUEVA VALIDACIÓN: ¿El TAG ya existe? 🔥🔥🔥
            if(tagNumero>0)
            {
                const tagDuplicado = await validarTag(tagNumero);
                if (tagDuplicado) {
                    Swal.showValidationMessage("❌ Este TAG ya está en uso. ¡Elige otro!");
                    return false;
                }
            }

            // 4️⃣ AUTO y OBS (solo normalización, pueden estar vacíos)
            const autoNormalizado = normalizarTexto(document.getElementById('inputAuto').value);
            const obsNormalizada = normalizarTexto(document.getElementById('textareaObs').value);
  
            return {
                nombre: nombreNormalizado,
                auto: autoNormalizado,
                placa: placaNormalizada,
                placa_oscura: placaNormalizada.checked,
                passw: tagNumero,
                obs: obsNormalizada,
                picol: parseInt(document.querySelector('input[name="estado"]:checked').value),
                // Campos adicionales para el endpoint:
                idfoto: 0,
                idcasa: idCasacache,          // <- Asegúrate de que esto esté disponible
                idusuario: 1,             // <- Ejemplo: ID del usuario logueado
                casetalog: idCasetacache                       // <- Ajusta según tu lógica
            };
        },
        customClass: {
            popup: 'residente-popup',
            title: 'residente-title',
            htmlContainer: 'residente-html'
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            const datos = result.value;
            datos.idresidente = 0; // 👈 0 indica que es un INSERT (no UPDATE)

            // 🔥 Mostrar loader mientras se guarda
            Swal.fire({
                title: 'Guardando...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            try {
                // Llamar al endpoint (mismo que en edición)
                const response = await fetch(`${BACKEND_HOST}/api/residente/guardar`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datos)
                });
                const data = await response.json();

                if (data.success) {
                    Swal.fire('¡Guardado!', 'Residente agregado correctamente', 'success');
                    // Recargar la lista de residentes
                    if (typeof cargarResidentes === 'function') await cargarResidentes(idCasacache);
                } else {
                    throw new Error(data.error || 'Error al guardar');
                }
            } catch (error) {
                Swal.fire('Error', error.message, 'error');
            }
        }
    });
}


function abrirNuevoTrabajador() {
    // Fecha actual formateada
    const fechaActual = new Date().toLocaleDateString('es-MX');
    
    Swal.fire({
        title: `<small>NUEVO PEATÓN</small>`,
        html: `
            <div class="trabajador-grid">
                <!-- 🔥 Nombre completo -->
                <div class="campo-nombre">
                    <input type="text" id="inputNombre" class="nombre-editable" placeholder="PATERNO MATERNO NOMBRE" maxlength="40">
                </div>

                <!-- Columna Izquierda -->
                <div class="columna">
                    <div class="campo">
                        <label>Oficio</label>
                        <select id="selectOficio" class="form-control">
                            ${cacheOficios.map(oficio => `
                                <option value="${oficio.idconcepto}">${oficio.concepto}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="campo">
                        <label>N° TAG</label>
                        <input type="number" id="inputTag" value="0" min="0" max="16777215">
                    </div>
                    <div class="campo">
                        <label>Fecha Alta</label>
                        <input type="text" value="${fechaActual}" readonly>
                    </div>
                    <div class="campo-checkbox">
                        <label>
                            <input type="checkbox" id="checkDuerme">
                            Duerme en el domicilio
                        </label>
                    </div>

                    <!-- 🔥 Sección de Datos Personales -->
                    <div class="campo-extra">
                        <details open>
                            <summary>📝 Datos personales</summary>
                            <div class="subgrid">
                                <div class="campo">
                                    <label>Calle</label>
                                    <input type="text" id="inputCalle" placeholder="Ej. Av. Principal">
                                </div>
                                <div class="campo">
                                    <label>Colonia</label>
                                    <input type="text" id="inputColonia" placeholder="Ej. Centro">
                                </div>
                                <div class="campo">
                                    <label>Teléfono</label>
                                    <input type="tel" id="inputTelefono" placeholder="Ej. 5512345678">
                                </div>
                                <div class="campo">
                                    <label>C.P.</label>
                                    <input type="text" id="inputCP" placeholder="Ej. 12345">
                                </div>
                                <div class="campo">
                                    <label>Encargado</label>
                                    <input type="text" id="inputEncargado" placeholder="Ej. Ing. Pérez">
                                </div>
                            </div>
                        </details>
                    </div>
                </div>

                <!-- Columna Derecha -->
                <div class="columna">
                    <div class="campo">
                        <label>Estatus TAG</label>
                        <div class="radio-group-estatus">
                            <label class="radio-option">
                                <input type="radio" name="estatus" value="1" checked>
                                <span class="radio-label activo">Activo</span>
                            </label>
                            <label class="radio-option">
                                <input type="radio" name="estatus" value="2">
                                <span class="radio-label mal-uso">Mal uso</span>
                            </label>
                            <label class="radio-option">
                                <input type="radio" name="estatus" value="3">
                                <span class="radio-label extravio">Extravío</span>
                            </label>
                        </div>
                    </div>
                    <div class="campo-dias">
                        <label>ASISTE LOS DÍAS:</label>
                        <div class="checkbox-dias">
                            ${['L', 'M', 'I', 'J', 'V', 'S', 'D'].map((dia, pos) => `
                                <label class="dia-option">
                                    <input type="checkbox" checked data-dia="${pos}">
                                    <span>${dia}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    <div class="campo">
                        <label>Fecha Baja</label>
                        <input type="date" id="inputFechaBaja" value="2050-01-01">
                    </div>
                    <div class="campo">
                        <label>Observaciones</label>
                        <textarea id="textareaObs" placeholder="Detalles adicionales"></textarea>
                    </div>
                    <!-- 🔥 FOTO DEL TRABAJADOR - SOLO SI SOPORTA FOTO -->
                    ${soportaFoto ? `
                    <div class="campo-extra">
                        <details open>
                            <summary>📸 Fotografía del peatón</summary>
                            <div class="subgrid">
                                <div class="campo" style="grid-column: span 2;">
                                    <div id="dropAreaFoto" class="drop-foto">
                                        <input type="file" id="fileFoto" accept="image/*" hidden>
                                        <p id="dropTextFoto">Arrastra la foto o haz click</p>
                                    </div>
                                    <img id="previewRostro" style="display:none; margin-top:10px; width:160px; height:auto; border-radius:6px;">
                                </div>
                            </div>
                        </details>
                    </div>
                    ` : ''}
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        width: '800px',
        showDenyButton: false, // Sin botón de eliminar
        didOpen: () => {
            // Solo instalar el handler si soporta foto
            if (soportaFoto) {
                instalarFotoHandler();
            }
        },

        preConfirm: async () => {
            // 🔥 Validaciones (igual que en edición)
            const nombreInput = document.getElementById('inputNombre').value.trim();
            if (nombreInput.length < 4) {
                Swal.showValidationMessage("❌ El nombre debe tener al menos 4 caracteres");
                return false;
            }
            if (nombreInput.length > 40) {
                Swal.showValidationMessage("❌ El nombre no debe superar 40 caracteres");
                return false;
            }

            const tagInput = document.getElementById('inputTag').value.trim();
            const tagNumber = parseInt(tagInput);
            if (isNaN(tagNumber)) {
                Swal.showValidationMessage("❌ El TAG debe ser un número válido");
                return false;
            }
            if (tagNumber < 0 || tagNumber > 16777215) {
                Swal.showValidationMessage("❌ El TAG debe estar entre 0 y 16,777,215");
                return false;
            }
            if(tagNumber > 0) {
                // 🔥🔥🔥 NUEVA VALIDACIÓN: ¿El TAG ya existe? 🔥🔥🔥
                const tagDuplicado = await validarTag(tagNumber);
                if (tagDuplicado) {
                    Swal.showValidationMessage("❌ Este TAG ya está en uso. ¡Elige otro!");
                    return false;
                }
            }

            // Convertir checkboxes de días a string binario (ej. "1111100")
            function getDiasSeleccionados() {
                const dias = Array(7).fill('0');
                document.querySelectorAll('.checkbox-dias input[type="checkbox"]:checked').forEach(cb => {
                    dias[parseInt(cb.getAttribute('data-dia'))] = '1';
                });
                return dias.join('');
            }

            // Preparar datos base
            const datos = {
                nombre: nombreInput.toUpperCase(),
                oficio: parseInt(document.getElementById('selectOficio').value),
                passw: tagNumber,
                duerme_domicilio: document.getElementById('checkDuerme').checked,
                estatus: document.querySelector('input[name="estatus"]:checked').value,
                f_baja: document.getElementById('inputFechaBaja').value || null,
                obs: document.getElementById('textareaObs').value.toUpperCase(),
                calle: document.getElementById('inputCalle').value.toUpperCase(),
                colonia: document.getElementById('inputColonia').value.toUpperCase(),
                tel: document.getElementById('inputTelefono').value,
                cp: document.getElementById('inputCP').value,
                encargado: document.getElementById('inputEncargado').value.toUpperCase(),
                h24: 0, // Default: no 24hrs
                dias: getDiasSeleccionados(),
                // Campos requeridos por el endpoint:
                idtrabajador: 0, // 0 = Nuevo registro
                idcasa: idCasacache, // Ajusta según tu lógica
                idusuario: 1, // ID del usuario logueado
                casetalog: idCasetacache, // Ajusta según tu lógica
                idfoto: 0,
                idfoto2: 0
            };

            // 🔥 Solo agregar idfoto3 si soporta foto
            if (soportaFoto) {
                datos.idfoto3 = 0;
            }

            return datos;
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            const datos = result.value;

            Swal.fire({
                title: 'Guardando...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            try {
                // 1️⃣ Subir foto primero SOLO si soportaFoto es true
                if (soportaFoto) {
                    const idFoto = await mandarFotoAlBackend();
                    datos.idfoto = idFoto || 0;
                    // Si tienes manejo específico para foto3:
                     datos.idfoto3 = idFoto || 0;
                }

                // Modificar el fetch según soportaFoto
                const endpoint = soportaFoto 
                    ? `${BACKEND_HOST}/api/trabajador/guardar-v2`
                    : `${BACKEND_HOST}/api/trabajador/guardar`;

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datos)
                });
                // // 2️⃣ Guardar trabajador
                // const response = await fetch(`${BACKEND_HOST}/api/trabajador/guardar`, {
                //     method: 'POST',
                //     headers: { 'Content-Type': 'application/json' },
                //     body: JSON.stringify(datos)
                // });

                const data = await response.json();

                if (data.success) {
                    Swal.fire('¡Guardado!', 'Trabajador agregado correctamente', 'success');
                    await cargarTrabajadores(idCasacache);
                } else {
                    throw new Error(data.error || 'Error al guardar');
                }

            } catch (error) {
                Swal.fire('Error', error.message, 'error');
            }
        }
    });
}

function instalarFotoHandler() {
    const dropArea = document.getElementById("dropAreaFoto");
    const fileInput = document.getElementById("fileFoto");
    const previewRostro = document.getElementById("previewRostro");

    ["dragenter", "dragover"].forEach(ev =>
        dropArea.addEventListener(ev, e => {
            e.preventDefault();
            dropArea.classList.add("hover");
        })
    );
    ["dragleave", "drop"].forEach(ev =>
        dropArea.addEventListener(ev, e => {
            e.preventDefault();
            dropArea.classList.remove("hover");
        })
    );

    dropArea.addEventListener("click", () => fileInput.click());

    dropArea.addEventListener("drop", e => {
        const file = e.dataTransfer.files[0];
        if (file) procesarFoto(file, previewRostro);
    });

    fileInput.addEventListener("change", e => {
        const file = e.target.files[0];
        if (file) procesarFoto(file, previewRostro);
    });

    // Hacer la vista previa clickeable para cambiar la foto (y resetear el input)
    previewRostro.style.cursor = 'pointer';
    previewRostro.title = 'Haz click para cambiar la foto';
    previewRostro.addEventListener('click', () => {
        // Resetear el value para permitir seleccionar el mismo archivo otra vez
        fileInput.value = '';
        fileInput.click();
    });
}

let faceModel = null;
async function loadFaceModel() {
    if (faceModel) return faceModel;

    // 🔥 GUARDAR FETCH ACTUAL
    const customFetch = window.fetch;

    try {
        // 🔥 USAR FETCH ORIGINAL SOLO DURANTE LA CARGA DEL MODELO
        window.fetch = originalFetch;

        faceModel = await blazeface.load();
        return faceModel;

    } finally {
        // 🔥 RESTAURAR FETCH PERSONALIZADO
        window.fetch = customFetch;
    }
}


async function compressImage(base64, maxSizeBytes = 50 * 1024) {
    const blob = await (await fetch(base64)).blob();
    
    let quality = 0.85;
    let compressedBase64 = base64;
    let scale = 1;

    while (true) {
        const compressedBlob = await new Promise(resolve => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                
                // 🔥 Reducir dimensiones si es necesario
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                
                ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);

                canvas.toBlob(
                    resolve,
                    "image/jpeg",
                    quality
                );
            };
            img.src = base64;
        });

        //console.log(`📸 Intento: quality=${quality.toFixed(2)}, scale=${scale.toFixed(2)}, size=${(compressedBlob.size / 1024).toFixed(1)}KB`);

        if (compressedBlob.size <= maxSizeBytes || (quality < 0.3 && scale < 0.5)) {
            // convertir a base64
            const reader = new FileReader();
            reader.readAsDataURL(compressedBlob);
            await new Promise(res => reader.onloadend = res);
            //console.log(`✅ Compresión exitosa: ${(compressedBlob.size / 1024).toFixed(1)}KB`);
            return reader.result;
        }

        // Bajar calidad primero
        if (quality > 0.3) {
            quality -= 0.08;
        } else {
            // Si la calidad está muy baja, reducir dimensiones
            scale *= 0.9;
        }
    }
}

async function mandarFotoAlBackend() {
    if (!window.fotoRecortada) {
        console.error("No hay foto recortada");
        return null;
    }

    // quitar el encabezado "data:image/jpeg;base64,"
    const base64 = window.fotoRecortada.split(",")[1];

    try {
        const response = await fetch(`${BACKEND_HOST}/api/spalta`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ foto: base64 })
        });

        // 🔥 VERIFICAR si la respuesta es OK ANTES de parsear JSON
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Error HTTP ${response.status}:`, errorText.substring(0, 500));
            Swal.showValidationMessage(`⚠️ Error del servidor (${response.status}). Intenta con otra foto.`);
            return null;
        }

        // 🔥 Verificar que la respuesta es JSON válido
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const responseText = await response.text();
            console.error("❌ Respuesta no es JSON:", responseText.substring(0, 500));
            Swal.showValidationMessage("⚠️ El servidor devolvió una respuesta inválida. Intenta de nuevo.");
            return null;
        }

        const data = await response.json();
        //console.log("📥 Respuesta backend foto:", data);

        if (!data.success) {
            console.error("❌ Error backend:", data.error);
            Swal.showValidationMessage(`⚠️ ${data.error || "Error al subir la foto"}`);
            return null;
        }

        // Extraer el id_foto
        const idFoto = data.id;

        if (!idFoto) {
            console.error("❌ No se encontró id_foto en la respuesta");
            Swal.showValidationMessage("⚠️ No se pudo procesar la foto en el servidor.");
            return null;
        }

        //console.log("🟢 Foto insertada con ID:", idFoto);
        return idFoto;

    } catch (err) {
        console.error("❌ Error mandando foto:", err);
        Swal.showValidationMessage(`⚠️ Error de conexión: ${err.message}`);
        return null;
    }
}

async function procesarFoto(file, previewEl) {
    await loadFaceModel();

    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = async () => {
        const faces = await faceModel.estimateFaces(img);

        if (faces.length === 0) {
            const msg = document.querySelector('.swal2-validation-message');
            if (msg) {
                msg.innerHTML = "⚠️ La imagen no contiene un rostro válido.";
                msg.style.display = "block";
            } else {
                Swal.showValidationMessage("⚠️ La imagen no contiene un rostro válido.");
            }

            document.getElementById("dropAreaFoto").style.display = "flex";
            previewEl.style.display = "none";
            // Resetear el file input para permitir volver a intentar (incluso con el mismo archivo)
            const fileEl = document.getElementById("fileFoto");
            if (fileEl) fileEl.value = '';
            return;
        }

        Swal.resetValidationMessage();

        // rostro más grande
        const mainFace = faces.reduce((a, b) =>
            (a.bottomRight[0] - a.topLeft[0]) * (a.bottomRight[1] - a.topLeft[1]) >
            (b.bottomRight[0] - b.topLeft[0]) * (b.bottomRight[1] - b.topLeft[1]) ? a : b
        );

        const [x1, y1] = mainFace.topLeft;
        const [x2, y2] = mainFace.bottomRight;

        const w = x2 - x1;
        const h = y2 - y1;

        // -----------------------------------------
        // 🚨 VALIDACIÓN DEL TAMAÑO DEL ROSTRO
        // -----------------------------------------

        const MIN_PIXELS = 90;

        if (w < MIN_PIXELS || h < MIN_PIXELS) {

            Swal.showValidationMessage(
                "⚠️ El rostro es demasiado pequeño."
            );

            document.getElementById("dropAreaFoto").style.display = "flex";
            previewEl.style.display = "none";
            // Resetear el file input para permitir volver a intentar
            const fileEl = document.getElementById("fileFoto");
            if (fileEl) fileEl.value = '';
            return;
        }

        // porcentaje del área
        const faceArea = w * h;
        const totalArea = img.width * img.height;
        const pct = (faceArea / totalArea) * 100;

        if (pct < 5) {

            Swal.showValidationMessage(
                "⚠️ El rostro aparece muy lejos."
            );

            document.getElementById("dropAreaFoto").style.display = "flex";
            previewEl.style.display = "none";
            // Resetear el file input para permitir volver a intentar
            const fileEl = document.getElementById("fileFoto");
            if (fileEl) fileEl.value = '';
            return;
        }

        // -----------------------------------------
        // ✔ RECORTE SI TODO ESTÁ OK
        // -----------------------------------------

        const padX = w * 0.35;
        const padY = h * 0.85;

        const cropX = Math.max(0, x1 - padX);
        const cropY = Math.max(0, y1 - padY);
        const cropW = Math.min(img.width, w + padX * 2);
        const cropH = Math.min(img.height, h + padY * 2);

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = 500;
        canvas.height = 640;

        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);

        const finalFoto = canvas.toDataURL("image/jpeg", 0.92);

        previewEl.src = finalFoto;
        previewEl.style.display = "block";

        document.getElementById("dropAreaFoto").style.display = "none";

        window.fotoRecortada = await compressImage(finalFoto, 100 * 1024);
        // Resetear el input para que seleccionar la misma foto dispare 'change' de nuevo
        const fileEl = document.getElementById("fileFoto");
        if (fileEl) fileEl.value = '';
    };
}


document.getElementById('add-residente').addEventListener('click', () => {
    // Obtén el ID de la casa (ajusta según tu lógica)
    abrirNuevoResidente();
});

document.getElementById('add-trabajador').addEventListener('click', () => {
    abrirNuevoTrabajador();
});



// 2. Función para obtener los datos actuales del formulario
function obtenerDatosFormulario() {
    return {
        direccion: document.getElementById('direccion').value,
        tel: document.getElementById('telefono').value,
        categoria: document.getElementById('categoria').value,
        lote: document.getElementById('lote').value,
        caseta: document.getElementById('caseta').value,
        restriccion: document.getElementById('restriccion').value,
        contrato: document.getElementById('contrato').value,
        fcuota: document.getElementById('fecha-cuota').value,
        picol: document.getElementById('permiso-residentes').checked ? 1 : 0,
        pitra: document.getElementById('permiso-trabajadores').checked ? 1 : 0
    };
}

// 3. Función para verificar cambios
function verificarCambios() {
    const datosActuales = obtenerDatosFormulario();
    haCambiado = !Object.keys(valoresIniciales).every(key => 
        valoresIniciales[key] === datosActuales[key]
    );
    return haCambiado;
}

// 4. Event listeners para detectar cambios
document.querySelectorAll('input, textarea, select').forEach(element => {
    element.addEventListener('change', verificarCambios);
});

// 5. Función para guardar los datos
async function guardarDatos() {
    if (!verificarCambios()) {
        
        await Swal.fire({
            icon: 'info',
            title: 'Sin cambios',
            text: 'No se detectaron modificaciones para guardar',
            confirmButtonText: 'Entendido'
        });
        return false;
    }

    const datos = obtenerDatosFormulario();
    
    datos.direccion = datos.direccion.toUpperCase();
    datos.lote = datos.lote.toUpperCase();
    datos.restriccion = datos.restriccion.toUpperCase();
    
    // Validaciones manuales (por si el HTML falla o hay lógica compleja)
    if (datos.direccion.trim().length < 4) {
        await Swal.fire("Error", "La dirección debe tener al menos 4 caracteres", "error");
        return false;
    }

    if (!datos.categoria) {
        await Swal.fire("Error", "Selecciona una categoría", "error");
        return false;
    }

    if (!datos.caseta) {
        await Swal.fire("Error", "Selecciona una caseta", "error");
        return false;
    }

    if (isNaN(datos.contrato)) {
        await Swal.fire("Error", "El contrato debe ser numérico", "error");
        return false;
    }

    // Validar teléfono (ejemplo: 555-1234567)
    const telefonoValido = /^\d{3}-\d{6,7}$/.test(datos.telefono);
    if((datos.tel).length>20)
    {
        await Swal.fire("Error", "Teléfono mayor a 20 caracteres", "error");
    }
    // if (isNaN(datos.tel)) {
    //     await Swal.fire("Error", "Teléfono inválido. Usa el formato numerico", "error");
    //     return false;
    // }

    try {
        const response = await fetch(`${BACKEND_HOST}/api/casa/guardar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...datos,
                idusuario: 1, // Aquí deberías poner el ID real del usuario
                idcasa: idCasacache, // O el ID si es edición
                casetalog: datos.caseta, // Ajustar según necesidad
            })
        });

        const result = await response.json();
        
        if (result.success) {
            await Swal.fire({
                icon: 'success',
                title: '¡Guardado!',
                text: 'Los datos se guardaron correctamente',
                confirmButtonText: 'Genial'
            });
            // Actualizamos los valores iniciales con los nuevos
            valoresIniciales = obtenerDatosFormulario();
            haCambiado = false;
            return true;
        } else {
            throw new Error(result.error || 'Error desconocido');
        }
    } catch (error) {
        await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo guardar: ' + error.message,
            confirmButtonText: 'Entendido'
        });
        return false;
    }
}

// 6. Asignar al botón "Grabar y Salir"
document.querySelector('.btn-primary').addEventListener('click', async () => {
    const guardadoExitoso = await guardarDatos();
    if (guardadoExitoso || !haCambiado) {
        // Redirigir o cerrar el modal/módulo
        window.history.back();
    }
});

document.querySelector('.btn-danger').addEventListener('click', async () => {
        window.history.back();
});

// Función genérica para filtrar tablas
function filtrarTabla(inputId, tablaId) {
    const input = document.getElementById(inputId);
    const tabla = document.getElementById(tablaId);
    const filas = tabla.getElementsByTagName('tr');

    input.addEventListener('input', () => {
        const texto = input.value.toLowerCase();
        
        for (let fila of filas) {
            const celdas = fila.getElementsByTagName('td');
            let coincide = false;
            
            for (let celda of celdas) {
                if (celda.textContent.toLowerCase().includes(texto)) {
                    coincide = true;
                    break;
                }
            }
            
            fila.style.display = coincide ? '' : 'none';
        }
    });
}

// ========== INICIO ========== //
document.addEventListener('DOMContentLoaded', cargarDomicilioCompleto);


