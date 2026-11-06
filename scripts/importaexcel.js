// ============================================================
//  importaexcel.js - Lógica de importación de Excel
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
      'x-mqtt-topic': 'importaexel', // <- Tu header personalizado de siempre
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
let archivoSeleccionado = null;

// ---------- DOM REFS ----------
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileSelected = document.getElementById('fileSelected');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const btnRemoveFile = document.getElementById('btnRemoveFile');
const btnCancel = document.getElementById('btnCancel');
const btnUpload = document.getElementById('btnUpload');
const condoNameSpan = document.getElementById('condoName');

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
        condoNameSpan.textContent = `🏷️ ${condo.name || 'Sin nombre'}`;
    } catch (e) {
        condoNameSpan.textContent = '🏷️ Error';
    }
}

// ============================================================
//  FORMATEAR TAMAÑO DE ARCHIVO
// ============================================================
function formatearTamano(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ============================================================
//  VALIDAR ARCHIVO
// ============================================================
function validarArchivo(file) {
    const extensionesPermitidas = ['.xlsx', '.xls', '.csv'];
    const nombre = file.name.toLowerCase();
    const tieneExtensionValida = extensionesPermitidas.some(ext => nombre.endsWith(ext));

    if (!tieneExtensionValida) {
        alert('❌ Solo se permiten archivos .xlsx, .xls o .csv');
        return false;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        alert('❌ El archivo no puede pesar más de 5MB');
        return false;
    }

    return true;
}

// ============================================================
//  MANEJAR ARCHIVO SELECCIONADO
// ============================================================
function manejarArchivo(file) {
    if (!validarArchivo(file)) return;

    archivoSeleccionado = file;

    // Mostrar info del archivo
    fileName.textContent = file.name;
    fileSize.textContent = formatearTamano(file.size);
    fileSelected.classList.remove('hidden');
    btnUpload.disabled = false;

    //('📄 Archivo seleccionado:', file.name, formatearTamano(file.size));
}

// ============================================================
//  LIMPIAR ARCHIVO
// ============================================================
function limpiarArchivo() {
    archivoSeleccionado = null;
    fileInput.value = '';
    fileSelected.classList.add('hidden');
    btnUpload.disabled = true;
}

// ============================================================
//  SUBIR ARCHIVO (placeholder)
// ============================================================
// async function importarCasas() {
//     if (!archivoSeleccionado) {
//         alert('❌ No hay archivo seleccionado');
//         return;
//     }

//     // 🔮 Aquí después: fetch a /api/knovo/importar-casas
//     const confirmar = confirm(`¿Importar el archivo "${archivoSeleccionado.name}"?\n\nEsta acción agregará las casas nuevas del Excel.`);
//     if (!confirmar) return;

//     btnUpload.disabled = true;
//     btnUpload.textContent = '⏳ Importando...';

//     // Placeholder - simular proceso
//     setTimeout(() => {
//         alert('🔧 Pendiente: conectar endpoint de importación');
//         btnUpload.disabled = false;
//         btnUpload.textContent = '📥 Importar Casas';
//     }, 1000);
// }


// ============================================================
//  LEER EXCEL Y EXTRAER NOMBRES DE LA COLUMNA A
// ============================================================
async function leerExcelYExtraerNombres(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Tomar la primera hoja
                const primeraHoja = workbook.SheetNames[0];
                const hoja = workbook.Sheets[primeraHoja];

                // Convertir la hoja a JSON (array de arrays)
                // header: 1 → la primera fila NO es header
                // defval: '' → celdas vacías quedan como string vacío
                const filas = XLSX.utils.sheet_to_json(hoja, {
                    header: 1,
                    defval: '',
                    blankrows: false
                });

                // Extraer SOLO la columna A (índice 0)
                // Ignorar filas vacías y hacer trim
                const nombres = filas
                    .map(fila => String(fila[0] || '').trim())
                    .filter(nombre => nombre !== '');

                resolve(nombres);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('Error al leer el archivo'));
        reader.readAsArrayBuffer(file);
    });
}

// ============================================================
//  IMPORTAR CASAS (función completa)
// ============================================================
async function importarCasas() {
    if (!archivoSeleccionado) {
        alert('❌ No hay archivo seleccionado');
        return;
    }

    // Validar que tengamos el idPostgres
    const condoData = sessionStorage.getItem('condominioSeleccionado');
    if (!condoData) {
        alert('❌ No hay condominio seleccionado');
        return;
    }
    const condo = JSON.parse(condoData);
    const idPostgres = condo.id;

    const originalText = btnUpload.textContent;
    btnUpload.disabled = true;
    btnUpload.textContent = '⏳ Leyendo Excel...';

    try {
        // ---------- 1. Leer el Excel ----------
        const nombresCasas = await leerExcelYExtraerNombres(archivoSeleccionado);
        //console.log('📋 Nombres extraídos:', nombresCasas);

        if (nombresCasas.length === 0) {
            throw new Error('El archivo no contiene nombres de casas en la columna A');
        }

        // ---------- 2. Confirmar ----------
        const confirmar = confirm(
            `Se encontraron ${nombresCasas.length} casa(s) en el archivo.\n\n` +
            `¿Deseas importarlas al condominio?`
        );
        if (!confirmar) {
            btnUpload.disabled = false;
            btnUpload.textContent = originalText;
            return;
        }

        // ---------- 3. Enviar al backend ----------
        btnUpload.textContent = '⏳ Importando...';

        const res = await fetch(`${API_URL}/api/knovo/importar-casas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idPostgres: idPostgres,
                casas: nombresCasas
            })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Error al importar casas');
        }

        // ---------- 4. Mostrar resultado ----------
        const { agregadas, ignoradas, total } = data.resumen;

        let mensaje = `✅ Importación completada\n\n`;
        mensaje += `📊 Total en el archivo: ${total}\n`;
        mensaje += `✅ Agregadas: ${agregadas}\n`;
        mensaje += `⏭️ Ignoradas (ya existían): ${ignoradas}`;

        alert(mensaje);

        // Volver a virtualmain
        window.location.href = 'virtualmain.html';

    } catch (error) {
        console.error('❌ Error al importar:', error);
        alert(error.message || 'Error al importar el archivo');
        btnUpload.disabled = false;
        btnUpload.textContent = originalText;
    }
}

// ============================================================
//  EVENT LISTENERS - DROP ZONE
// ============================================================

// Click en drop zone → abrir file picker
dropZone.addEventListener('click', () => fileInput.click());

// File input change
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) manejarArchivo(file);
});

// Drag & Drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');

    const file = e.dataTransfer.files[0];
    if (file) manejarArchivo(file);
});

// ============================================================
//  EVENT LISTENERS - ACCIONES
// ============================================================
btnRemoveFile.addEventListener('click', limpiarArchivo);

btnCancel.addEventListener('click', () => {
    window.location.href = 'virtualmain.html';
});

btnUpload.addEventListener('click', importarCasas);

// ============================================================
//  INICIALIZACIÓN
// ============================================================
cargarInfoCondominio();