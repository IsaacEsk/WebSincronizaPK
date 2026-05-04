// Traer la URL del backend desde config.js o fallback
const BACKEND_HOST = window.BACKEND_HOST;

// Estado global
let condominios = [];
let condominioSeleccionado = null;
let cuentas = []; // Para almacenar cuentas de administrador

// Datos falsos de administradores
const cuentasFalsas = [
    { id: 1, nombre: 'Admin General', email: 'admin@eskayser.com' },
    { id: 2, nombre: 'Administrador Las Palomas', email: 'admon.palomas@gmail.com' },
    { id: 3, nombre: 'Admin Zoi Bosques', email: 'admonzoiboques@gmail.com' },
    { id: 4, nombre: 'Admin San Javier', email: 'sanjavier@conciergemexico.com' },
    { id: 5, nombre: 'Admin Andalucia', email: 'proveedores@cotoandalucia.mx' }
];

// Elementos del DOM
const searchInput = document.getElementById('searchInput');
const condominiosContainer = document.getElementById('condominiosContainer');
const loadingSpinner = document.getElementById('loadingSpinner');
const emptyState = document.getElementById('emptyState');
const editModal = document.getElementById('editModal');
const detailModal = document.getElementById('detailModal');
const editForm = document.getElementById('editForm');
const newCountModal = document.getElementById('newCountModal');
const newCondoModal = document.getElementById('newCondoModal');

// ========== INICIALIZACIÓN ========== //
document.addEventListener('DOMContentLoaded', async () => {
    // Cargar administradores del backend
    await cargarAdministradores();
    
    await cargarCondominios();
    setupEventListeners();
});

// ========== CARGA DE DATOS ========== //
async function cargarAdministradores() {
    try {
        const response = await fetch(`${BACKEND_HOST}/api/usuarios`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.data) {
            // Mapear datos del backend al formato interno
            cuentas = data.data.map(admin => ({
                id: admin.id,
                nombre: admin.name,
                email: admin.email
            }));
            llenarSelectCuentas();
        } else {
            console.warn('No se pudieron cargar administradores, usando datos locales');
            cuentas = [...cuentasFalsas];
            llenarSelectCuentas();
        }

    } catch (error) {
        console.error('Error cargando administradores:', error);
        cuentas = [...cuentasFalsas];
        llenarSelectCuentas();
    }
}

async function cargarCondominios() {
    mostrarLoading(true);
    
    try {
        const response = await fetch(`${BACKEND_HOST}/api/condominios`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.data) {
            condominios = data.data;
            //console.log(condominios);
            renderizarCondominios(condominios);
        } else {
            throw new Error('Respuesta inválida del servidor');
        }

    } catch (error) {
        console.error('Error cargando condominios:', error);
        alert(`❌ Error al cargar condominios: ${error.message}`);
        mostrarVacio();
    } finally {
        mostrarLoading(false);
    }
}

// ========== RENDERIZACIÓN ========== //
function renderizarCondominios(items) {
    condominiosContainer.innerHTML = '';
    
    if (items.length === 0) {
        mostrarVacio();
        return;
    }
    
    emptyState.classList.add('hidden');
    
    items.forEach(condo => {
        const card = crearTarjetaCondominio(condo);
        condominiosContainer.appendChild(card);
    });
}

function crearTarjetaCondominio(condo) {
    const card = document.createElement('div');
    card.className = 'condo-card';
    
    const isActive = condo.isactive;
    const vigencia = new Date(condo.deleted_at);
    const today = new Date();
    const estaVigente = vigencia > today;
    
    const statusClass = isActive ? 'active' : 'inactive';
    const statusEmoji = isActive ? '🟢' : '🔴';
    const statusText = isActive ? 'Activo' : 'Inactivo';
    
    card.innerHTML = `
        <div class="condo-card-header">
            <div class="condo-card-name">🏢 ${condo.name}</div>
            <div class="condo-card-badge ${statusClass}">${statusEmoji} ${statusText}</div>
        </div>
        <div class="condo-card-body">
            <div class="condo-info-row">
                <span class="condo-info-label">👤 Admin:</span>
                <span class="condo-info-value">${condo.admin_name || 'N/A'}</span>
            </div>
            <div class="condo-info-row">
                <span class="condo-info-label">📧 Email:</span>
                <span class="condo-info-value">${condo.admin_email || 'N/A'}</span>
            </div>
            <div class="condo-info-row">
                <span class="condo-info-label">📅 Vigencia:</span>
                <span class="condo-info-value" style="color: ${estaVigente ? '#1db954' : '#f44336'}">
                    ${formatearFecha(condo.deleted_at)}
                </span>
            </div>
        </div>
        <div class="condo-card-footer">
            <button class="btn-card view" onclick="verDetalles(${condo.id})">
                <i class="fas fa-eye"></i> Ver
            </button>
            <button class="btn-card edit" onclick="abrirEdicionDirecta(${condo.id})">
                <i class="fas fa-edit"></i> Editar
            </button>
            <button class="btn-card bienvenida" onclick="abrirModalCredenciales(${condo.id})">
                <i class="fas fa-home"></i> Bienvenida
            </button>
        </div>
    `;
    
    return card;
}

// ========== DETALLES MODAL ========== //
function verDetalles(condoId) {
    const condo = condominios.find(c => c.id === condoId);
    if (!condo) return;
    
    condominioSeleccionado = condo;
    
    const detailTitle = document.getElementById('detailTitle');
    const detailContent = document.getElementById('detailContent');
    
    detailTitle.textContent = condo.name;
    
    const vigencia = new Date(condo.deleted_at);
    const today = new Date();
    const diasRestantes = Math.floor((vigencia - today) / (1000 * 60 * 60 * 24));
    
    detailContent.innerHTML = `
        <div class="detail-row">
            <div class="detail-label">ID</div>
            <div class="detail-value">${condo.id}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Nombre</div>
            <div class="detail-value">${condo.name}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Estado</div>
            <div class="detail-value status ${condo.isactive ? 'active' : 'inactive'}">
                ${condo.isactive ? '✓ Activo' : '✗ Inactivo'}
            </div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Admin</div>
            <div class="detail-value">${condo.admin_name || 'N/A'}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Email Admin</div>
            <div class="detail-value">${condo.admin_email || 'N/A'}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">ID Admin</div>
            <div class="detail-value">${condo.admin_user_id || 'N/A'}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Vigencia</div>
            <div class="detail-value">${formatearFecha(condo.deleted_at)}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Días Restantes</div>
            <div class="detail-value" style="color: ${diasRestantes > 0 ? '#4caf50' : '#f44336'}">
                ${diasRestantes > 0 ? diasRestantes + ' días' : 'Vencido'}
            </div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Activación</div>
            <div class="detail-value"><code>${condo.activation}</code></div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Knovo Code</div>
            <div class="detail-value"><code>${condo.knovo_code || ''}</code></div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Creado</div>
            <div class="detail-value">${formatearFecha(condo.created_at)}</div>
        </div>
    `;
    
    detailModal.classList.remove('hidden');
}

function cerrarDetailModal() {
    detailModal.classList.add('hidden');
    condominioSeleccionado = null;
}

// ========== CREDENCIALES MODAL ========== //
function abrirModalCredenciales(condoId) {
    const condo = condominios.find(c => c.id === condoId);
    if (!condo) return;

    const credentialsContent = document.getElementById('credentialsContent');
    
    const mensaje = `
        <div style="text-align: left; line-height: 1.8;">
            <p style="margin-bottom: 15px;">Estimado cliente,</p>
            
            <p>Por medio de este mensaje le compartimos sus credenciales de acceso para la plataforma administrativa.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>URL de acceso:</strong> https://admin.eskayser.com.mx/</p>
                <p><strong>Usuario:</strong> ${condo.admin_email || 'N/A'}</p>
                <p><strong>Contraseña:</strong> admin123</p>
            </div>
            
            <p><strong>Nota importante:</strong> Esta contraseña es provisional. Le recomendamos encarecidamente cambiarla tras su primer ingreso. Dentro del sistema, encontrará un botón denominado "Cambiar contraseña" una vez que haya iniciado sesión correctamente.</p>
            
            <h3 style="margin-top: 25px; margin-bottom: 15px;">Funcionalidades de la plataforma</h3>
            
            <p><strong>Acceso Inicial:</strong> Al ingresar, verá un listado de los condominios que administra. En su caso, aparecerá únicamente <strong>${condo.name}</strong>.</p>
            
            <p><strong>Panel de Administración:</strong> Al seleccionar el condominio, accederá al panel de control. Su interfaz es similar a la del software PuertaK y actualmente permite las siguientes funciones:</p>
            
            <ul style="margin-left: 20px;">
                <li>Gestión (altas, bajas y modificaciones) de residentes y trabajadores.</li>
                <li>Gestión (altas, bajas y edición) de casas o unidades habitacionales.</li>
                <li>Consulta de reportes de:
                    <ul style="margin-top: 10px;">
                        <li>Visitantes vehiculares.</li>
                        <li>Visitantes peatonales.</li>
                        <li>Trabajadores.</li>
                        <li>Residentes.</li>
                    </ul>
                </li>
            </ul>
            
            <p style="margin-top: 20px;">La plataforma está optimizada para su uso en escritorio (computadora de escritorio o laptop). Próximamente se encontrará disponible una versión para dispositivos móviles. Es importante mencionar que seguiremos incorporando nuevas funciones de manera continua.</p>
            
            <p>La interfaz ha sido diseñada para ser intuitiva y cuenta con instrucciones integradas que facilitan su uso.</p>
            
            <p style="margin-top: 20px;">Quedamos a su disposición para cualquier duda o asistencia que pueda requerir.</p>
        </div>
    `;
    
    credentialsContent.innerHTML = mensaje;
    document.getElementById('credentialsModal').classList.remove('hidden');
}

function cerrarModalCredenciales() {
    document.getElementById('credentialsModal').classList.add('hidden');
}

// ========== COPIAR MENSAJE ========== //
function copiarAlPortapapeles(btn) {
    const credentialsContent = document.getElementById('credentialsContent');
    
    // Extraer solo el texto del contenido (sin HTML)
    let texto = credentialsContent.innerText;
    
    // Copiar al portapapeles
    navigator.clipboard.writeText(texto).then(() => {
        // Mostrar confirmación visual
        const textOriginal = btn.textContent;
        btn.textContent = '✅ Copiado!';
        btn.style.background = '#4caf50';
        
        setTimeout(() => {
            btn.textContent = textOriginal;
            btn.style.background = '';
        }, 2000);
    }).catch(err => {
        console.error('Error al copiar:', err);
        alert('❌ No se pudo copiar el mensaje');
    });
}

// ========== EDICIÓN MODAL ========== //
function abrirEdicionDirecta(condoId) {
    const condo = condominios.find(c => c.id === condoId);
    if (!condo) return;
    
    condominioSeleccionado = condo;
    abrirEdicion();
}

function abrirEdicion() {
    if (!condominioSeleccionado) return;
    
    const condo = condominioSeleccionado;
    
    // Llenar combo de administradores
    const selectElement = document.getElementById('editAdmin');
    selectElement.innerHTML = '<option value="">-- Selecciona un administrador --</option>';
    
    cuentas.forEach(cuenta => {
        const option = document.createElement('option');
        option.value = cuenta.id;
        option.textContent = `${cuenta.nombre} (${cuenta.email})`;
        selectElement.appendChild(option);
    });
    
    // Llenar formulario con datos del condominio
    document.getElementById('editName').value = condo.name;
    document.getElementById('editAdmin').value = condo.admin_user_id || '';
    document.getElementById('editKnovoCode').value = condo.knovo_code || '';
    
    const fechaVigencia = new Date(condo.deleted_at);
    const fechaFormato = fechaVigencia.toISOString().split('T')[0];
    document.getElementById('editVigencia').value = fechaFormato;
    
    // Limpiar errores previos
    document.getElementById('editNameError').textContent = '';
    document.getElementById('editAdminError').textContent = '';
    document.getElementById('editVigenciaError').textContent = '';
    document.getElementById('editName').classList.remove('input-error');
    document.getElementById('editAdmin').classList.remove('input-error');
    document.getElementById('editVigencia').classList.remove('input-error');
    
    detailModal.classList.add('hidden');
    editModal.classList.remove('hidden');
}

function cerrarModal() {
    editModal.classList.add('hidden');
    editForm.reset();
}

async function guardarCambios() {
    if (!condominioSeleccionado) return;
    
    const nombreEl = document.getElementById('editName');
    const adminEl = document.getElementById('editAdmin');
    const knovoCodeEl = document.getElementById('editKnovoCode');
    const vigenciaEl = document.getElementById('editVigencia');

    const nombre = nombreEl.value.trim();
    const adminId = adminEl.value;
    const knovoCode = knovoCodeEl.value.trim();
    const vigencia = vigenciaEl.value;

    // Limpiar errores previos
    const clearError = (el, errElId) => {
        el.classList.remove('input-error');
        const e = document.getElementById(errElId);
        if (e) e.textContent = '';
    };

    clearError(nombreEl, 'editNameError');
    clearError(adminEl, 'editAdminError');
    clearError(vigenciaEl, 'editVigenciaError');

    let hasError = false;

    // Nombre: mínimo 3, máximo 90
    if (!nombre || nombre.length < 3 || nombre.length > 90) {
        nombreEl.classList.add('input-error');
        document.getElementById('editNameError').textContent = 'El nombre debe tener entre 3 y 90 caracteres';
        hasError = true;
    }

    // Administrador seleccionado
    if (!adminId) {
        adminEl.classList.add('input-error');
        document.getElementById('editAdminError').textContent = 'Selecciona una cuenta administradora';
        hasError = true;
    }

    // Vigencia: debe ser fecha futura (estricta)
    if (!vigencia) {
        vigenciaEl.classList.add('input-error');
        document.getElementById('editVigenciaError').textContent = 'Selecciona una fecha de vigencia';
        hasError = true;
    } else {
        const fechaSeleccionada = new Date(vigencia);
        const hoy = new Date();
        const hoyStart = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        if (fechaSeleccionada <= hoyStart) {
            vigenciaEl.classList.add('input-error');
            document.getElementById('editVigenciaError').textContent = 'La vigencia debe ser una fecha futura';
            hasError = true;
        }
    }

    if (hasError) {
        return;
    }

    // Encontrar la cuenta seleccionada
    const cuentaSeleccionada = cuentas.find(c => c.id === parseInt(adminId));

    if (!confirm(`¿Actualizar condominio "${nombre}"?`)) {
        return;
    }

    const submitBtn = document.querySelector('#editModal .btn-primary');
    const originalBtnText = submitBtn ? submitBtn.textContent : null;

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Guardando...';
        }

        const payload = {
            name: nombre,
            deleted_at: new Date(vigencia).toISOString(),
            idadmin: parseInt(adminId),
            knovo_code: knovoCode
        };

        const response = await fetch(`${BACKEND_HOST}/api/condominios/${condominioSeleccionado.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json().catch(() => ({}));

        if (response.ok || (result && result.success)) {
            const updated = result.data || result;

            // Actualizar datos del condominio en la lista
            const indice = condominios.findIndex(c => c.id === condominioSeleccionado.id);
            if (indice !== -1) {
                condominios[indice] = {
                    ...condominios[indice],
                    name: updated.name || nombre,
                    deleted_at: updated.deleted_at || payload.deleted_at,
                    admin_user_id: updated.idadmin || parseInt(adminId),
                    admin_name: (cuentaSeleccionada && cuentaSeleccionada.nombre) || condominios[indice].admin_name,
                    admin_email: (cuentaSeleccionada && cuentaSeleccionada.email) || condominios[indice].admin_email,
                    knovo_code: updated.knovo_code !== undefined ? updated.knovo_code : knovoCode,
                    isactive: updated.isactive !== undefined ? updated.isactive : condominios[indice].isactive
                };
            }

            renderizarCondominios(condominios);
            cerrarModal();
            alert('✅ Condominio actualizado exitosamente');
            return;
        }

        // Manejo de errores del backend
        const errMsg = result.error || `Error ${response.status || 'desconocido'}`;

        // Intentar mapear errores a campos
        const errLower = String(errMsg).toLowerCase();
        if (errLower.includes('name')) {
            nombreEl.classList.add('input-error');
            document.getElementById('editNameError').textContent = errMsg;
        } else if (errLower.includes('deleted') || errLower.includes('fecha')) {
            vigenciaEl.classList.add('input-error');
            document.getElementById('editVigenciaError').textContent = errMsg;
        } else if (errLower.includes('idadmin') || errLower.includes('admin')) {
            adminEl.classList.add('input-error');
            document.getElementById('editAdminError').textContent = errMsg;
        } else {
            alert(`❌ ${errMsg}`);
        }

    } catch (error) {
        console.error('Error guardando cambios:', error);
        alert(`❌ Error: ${error.message}`);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    }
}

// ========== BÚSQUEDA ========== //
function setupEventListeners() {
    searchInput.addEventListener('input', (e) => {
        const termino = e.target.value.toLowerCase().trim();
        
        if (termino === '') {
            renderizarCondominios(condominios);
            return;
        }
        
        const resultados = condominios.filter(condo => 
            condo.name.toLowerCase().includes(termino) ||
            condo.admin_name?.toLowerCase().includes(termino) ||
            condo.admin_email?.toLowerCase().includes(termino)
        );
        
        renderizarCondominios(resultados);
    });
}

// ========== UTILIDADES ========== //
function formatearFecha(fechaISO) {
    try {
        const opciones = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(fechaISO).toLocaleDateString('es-MX', opciones);
    } catch {
        return 'Fecha inválida';
    }
}

function mostrarLoading(mostrar) {
    if (mostrar) {
        loadingSpinner.classList.remove('hidden');
        condominiosContainer.innerHTML = '';
        emptyState.classList.add('hidden');
    } else {
        loadingSpinner.classList.add('hidden');
    }
}

function mostrarVacio() {
    emptyState.classList.remove('hidden');
    condominiosContainer.innerHTML = '';
}

function logoutAdmin() {
    if (confirm('¿Cerrar sesión?')) {
        sessionStorage.removeItem('isAdmin');
        window.location.href = 'index.html';
    }
}

// ========== NUEVO CONDOMINIO ========== //
async function abrirNuevoCondominio() {
    // Cargar administradores actualizados
    await cargarAdministradores();
    
    // Establecer vigencia por defecto (1 año desde hoy)
    const hoy = new Date();
    const unAno = new Date(hoy.getFullYear() + 1, hoy.getMonth(), hoy.getDate());
    const fechaFormato = unAno.toISOString().split('T')[0];
    
    document.getElementById('newCondoName').value = '';
    document.getElementById('newCondoAdmin').value = '';
    document.getElementById('newCondoVigencia').value = fechaFormato;
    
    newCondoModal.classList.remove('hidden');
}

function cerrarModalNuevoCondo() {
    newCondoModal.classList.add('hidden');
    document.getElementById('newCondoForm').reset();
}

async function guardarNuevoCondominio() {
    const nombreEl = document.getElementById('newCondoName');
    const adminEl = document.getElementById('newCondoAdmin');
    const vigenciaEl = document.getElementById('newCondoVigencia');

    const nombre = nombreEl.value.trim();
    const adminId = adminEl.value;
    const vigencia = vigenciaEl.value;

    // limpiar errores previos
    const clearError = (el, errElId) => {
        el.classList.remove('input-error');
        const e = document.getElementById(errElId);
        if (e) e.textContent = '';
    }

    clearError(nombreEl, 'newCondoNameError');
    clearError(adminEl, 'newCondoAdminError');
    clearError(vigenciaEl, 'newCondoVigenciaError');

    let hasError = false;

    // Nombre: mínimo 3, máximo 90
    if (!nombre || nombre.length < 3 || nombre.length > 90) {
        nombreEl.classList.add('input-error');
        document.getElementById('newCondoNameError').textContent = 'El nombre debe tener entre 3 y 90 caracteres';
        hasError = true;
    }

    // Administrador seleccionado
    if (!adminId) {
        adminEl.classList.add('input-error');
        document.getElementById('newCondoAdminError').textContent = 'Selecciona una cuenta administradora';
        hasError = true;
    }

    // Vigencia: debe ser fecha futura (estricta)
    if (!vigencia) {
        vigenciaEl.classList.add('input-error');
        document.getElementById('newCondoVigenciaError').textContent = 'Selecciona una fecha de vigencia';
        hasError = true;
    } else {
        const fechaSeleccionada = new Date(vigencia);
        const hoy = new Date();
        const hoyStart = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        if (fechaSeleccionada <= hoyStart) {
            vigenciaEl.classList.add('input-error');
            document.getElementById('newCondoVigenciaError').textContent = 'La vigencia debe ser una fecha futura';
            hasError = true;
        }
    }

    if (hasError) {
        return;
    }

    // Encontrar la cuenta seleccionada
    const cuentaSeleccionada = cuentas.find(c => c.id === parseInt(adminId));

    if (!confirm(`¿Crear condominio "${nombre}" bajo la administración de ${cuentaSeleccionada ? cuentaSeleccionada.nombre : adminId}?`)) {
        return;
    }

    const submitBtn = document.querySelector('#newCondoModal .btn-primary');
    const originalBtnText = submitBtn ? submitBtn.textContent : null;

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creando...';
        }

        const payload = {
            name: nombre,
            deleted_at: new Date(vigencia).toISOString(),
            idadmin: parseInt(adminId)
        };

        const response = await fetch(`${BACKEND_HOST}/api/condominios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json().catch(() => ({}));

        if (response.status === 201 || (result && result.success)) {
            const created = result.data || result;

            const nuevoCondominio = {
                id: created.id,
                name: created.name,
                created_at: created.created_at || new Date().toISOString(),
                deleted_at: created.deleted_at || payload.deleted_at,
                admin_user_id: created.idadmin || payload.idadmin || parseInt(adminId),
                activation: created.activation || '',
                isactive: created.isactive === undefined ? false : created.isactive,
                admin_name: (cuentaSeleccionada && cuentaSeleccionada.nombre) || '',
                admin_email: (cuentaSeleccionada && cuentaSeleccionada.email) || ''
            };

            condominios.unshift(nuevoCondominio);
            renderizarCondominios(condominios);
            cerrarModalNuevoCondo();
            alert('✅ Condominio creado exitosamente');
            return;
        }

        // Manejo de errores del backend
        const errMsg = result.error || `Error ${response.status || 'desconocido'}`;

        // Intentar mapear errores a campos
        const errLower = String(errMsg).toLowerCase();
        if (errLower.includes('name')) {
            nombreEl.classList.add('input-error');
            document.getElementById('newCondoNameError').textContent = errMsg;
        } else if (errLower.includes('deleted') || errLower.includes('fecha')) {
            vigenciaEl.classList.add('input-error');
            document.getElementById('newCondoVigenciaError').textContent = errMsg;
        } else if (errLower.includes('idadmin') || errLower.includes('admin')) {
            adminEl.classList.add('input-error');
            document.getElementById('newCondoAdminError').textContent = errMsg;
        } else {
            alert(`❌ ${errMsg}`);
        }

    } catch (error) {
        console.error('Error creando condominio:', error);
        alert(`❌ Error: ${error.message}`);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    }
}

// ========== NUEVA CUENTA ========== //
function abrirNuevaCounta() {
    document.getElementById('countName').value = '';
    document.getElementById('countEmail').value = '';
    newCountModal.classList.remove('hidden');
}

function cerrarModalCounta() {
    newCountModal.classList.add('hidden');
    document.getElementById('newCountForm').reset();
}

async function guardarNuevaCounta() {
    const nombre = document.getElementById('countName').value.trim();
    const email = document.getElementById('countEmail').value.trim();
    
    // Validaciones
    if (!nombre) {
        alert('⚠️ El nombre es requerido');
        return;
    }

    // Nombre: mínimo 3, máximo 90
    if (nombre.length < 3 || nombre.length > 90) {
        alert('⚠️ El nombre debe tener entre 3 y 90 caracteres');
        return;
    }

    // Validación básica de email (coincide con el backend)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        alert('⚠️ Debes ingresar un email con formato válido');
        return;
    }
    
    if (!confirm(`¿Crear cuenta para ${nombre} (${email})?`)) {
        return;
    }
    
    const submitBtn = document.querySelector('#newCountModal .btn-primary');
    const originalBtnText = submitBtn ? submitBtn.textContent : null;

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Guardando...';
        }

        const payload = { name: nombre, email: email };

        const response = await fetch(`${BACKEND_HOST}/api/usuarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json().catch(() => ({}));

        if (response.status === 201) {
            // Usuario creado
            const user = result.data || result;
            const nuevaCuenta = {
                id: user.id || (Math.max(...cuentas.map(c => c.id), 0) + 1),
                nombre: user.name || nombre,
                email: user.email || email
            };

            cuentas.push(nuevaCuenta);
            llenarSelectCuentas();
            cerrarModalCounta();
            alert('✅ Usuario creado exitosamente');
            return;
        }

        // Manejo de errores conocido por status
        if (response.status === 400) {
            const msg = result.error || 'Datos incorrectos o email inválido';
            alert(`❌ Error 400: ${msg}`);
            return;
        }

        if (response.status === 409) {
            const msg = result.error || 'El correo electrónico ya está en uso';
            alert(`❌ Error 409: ${msg}`);
            return;
        }

        // Otros errores
        const otherMsg = result.error || `Error ${response.status || 'desconocido'}`;
        alert(`❌ ${otherMsg}`);

    } catch (error) {
        console.error('Error creando cuenta:', error);
        alert(`❌ Error: ${error.message}`);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    }
}

// ========== LLENAR SELECT DE CUENTAS ========== //
function llenarSelectCuentas() {
    const selectElement = document.getElementById('newCondoAdmin');
    selectElement.innerHTML = '<option value="">-- Selecciona un administrador --</option>';
    
    cuentas.forEach(cuenta => {
        const option = document.createElement('option');
        option.value = cuenta.id;
        option.textContent = `${cuenta.nombre} (${cuenta.email})`;
        selectElement.appendChild(option);
    });
}
