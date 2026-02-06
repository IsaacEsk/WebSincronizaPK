//const BACKEND_HOST = 'http://localhost:3000';


//const BACKEND_HOST = 'https://sincronizapkbackend.onrender.com';

// Nuevo: tomar la URL desde config.js o fallback
const BACKEND_HOST = window.BACKEND_HOST;



// Verificamos si hay condominios en sessionStorage para mostrar la pre-sala directamente
const condominiosGuardados = JSON.parse(sessionStorage.getItem('condominiosUsuario'));
const usuarioGuardado = JSON.parse(sessionStorage.getItem('userData'));
const condominioSeleccionado = JSON.parse(sessionStorage.getItem('condominioSeleccionado'));

const condoString = sessionStorage.getItem('condominioSeleccionado');


document.addEventListener('DOMContentLoaded', () => {
    // console.log("Sie entre a ver si muestro la presala ");
    // console.log(condominiosGuardados);
    // console.log(usuarioGuardado);
    // console.log(condominioSeleccionado);


    if(usuarioGuardado)
    {
        if(condominiosGuardados.length > 0 && !condominioSeleccionado)
        {
            mostrarPresalaCondominios(condominiosGuardados, usuarioGuardado || { name: 'Usuario' });
        }
        else if(condominioSeleccionado)
        {
            swindow.location.href = `main.html`;
        }
    }
    else
    {

    }

});





document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    

    const email = document.getElementById('usuario').value; // Ojo: cambié "usuario" por "email" pa' que coincida con el backend
    const password = document.getElementById('password').value;
    
    // 🔥 Validación de super usuario
    if (email === 'admin' && password === 'eska1serPK') {
        sessionStorage.setItem('isAdmin', 'true');
        window.location.href = 'gestio.html';
        return;
    }
    
    try {
        const response = await fetch(`${BACKEND_HOST}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            // Si el backend devuelve error (400, 500, etc.)
            throw new Error(data.error || 'Error al iniciar sesión');
        }

        // ¡Éxito! Aquí manejamos la respuesta (data.user y data.condominios)
        //console.log("Login chido:", data);

        // 🚀 Pre-sala de condominios (aquí la magia)
        if (data.condominios && data.condominios.length > 0) {
            sessionStorage.setItem('userData', JSON.stringify(data.user));
            mostrarPresalaCondominios(data.condominios, data.user);
        } else {
            alert("No tienes condominios asignados");
            // window.location.href = "/dashboard.html"; // O redirige a donde sea
        }

    } catch (error) {
        console.error("Error:", error.message);
        alert(`❌ ${error.message}`); // Muestra el error del backend o el genérico
    }
});

function formatearFecha(fechaISO) {
    const opciones = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(fechaISO).toLocaleDateString('es-MX', opciones);
}

function mostrarPresalaCondominios(condominios, user) {
    sessionStorage.setItem('condominiosUsuario', JSON.stringify(condominios));
    
    const loginContainer = document.querySelector('.login-container');
    if (loginContainer) {
        loginContainer.style.display = 'none';
    } else {
        console.error("No se encontró .login-container");
        return;
    }
    
    const userName = (user && user.name) ? user.name : 'Usuario';
    const userEmail = (user && user.email) ? user.email : '';
    
    const tieneCaducados = condominios.some(condo => new Date(condo.deleted_at) < new Date());
    
    const presalaHTML = `
        <div class="presala">
            <div class="presala-header">
                <h2>¡Bienvenido, ${userName}!</h2>
                <div class="user-actions">
                    <button class="change-password-btn" title="Cambiar contraseña">
                        <i class="fas fa-key"></i> <span class="action-text">Cambiar contraseña</span>
                    </button>
                    <button class="logout-btn" title="Cerrar sesión">
                        <i class="fas fa-sign-out-alt"></i> <span class="action-text">Cerrar sesión</span>
                    </button>
                </div>
            </div>
            
            <p class="selection-prompt">Selecciona un condominio:</p>
            
            <div class="condominios-container">
                <div class="condominios-grid">
                    ${condominios.map(condo => {
                        const estaCaducado = new Date(condo.deleted_at) < new Date();
                        return `
                        <div class="condo-card ${estaCaducado ? 'expired' : ''}">
                            <button class="condo-btn" 
                                onclick="${estaCaducado ? '' : `seleccionarCondominio(${condo.id})`}"
                                ${estaCaducado ? 'disabled' : ''}>
                                <span class="condo-name">${condo.name}</span>
                                <span class="condo-meta">
                                    <span class="expiry ${estaCaducado ? 'expired' : ''}">
                                        Vigencia: ${formatearFecha(condo.deleted_at)}
                                    </span>
                                </span>
                            </button>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
            
            ${tieneCaducados ? `
            <div class="renew-notice">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="#D32F2F"/>
                </svg>
                <p>¿Condominio caducado? <strong>Renovaciones:</strong><br>
                <a href="tel:3331253000">33 3125 3000</a> • 
                <a href="https://wa.me/523318311824" target="_blank">WhatsApp</a></p>
            </div>
            ` : ''}
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', presalaHTML);
}

// function mostrarPresalaCondominios(condominios, user) {

//     sessionStorage.setItem('condominiosUsuario', JSON.stringify(condominios));
//     // 1. Ocultamos el contenedor completo del login (usando la CLASE)
//     const loginContainer = document.querySelector('.login-container');
//     if (loginContainer) {
//         loginContainer.style.display = 'none';
//     } else {
//         console.error("No se encontró .login-container");
//         return;
//     }
//     const userName = (user && user.name) ? user.name : 'Usuario';
//     const userEmail = (user && user.email) ? user.email : '';
    
//     // Verificar si hay condominios caducados
//     const tieneCaducados = condominios.some(condo => new Date(condo.deleted_at) < new Date());
    
//     const presalaHTML = `
//         <div class="presala">
//             <h2>¡Bienvenido, ${userName}!</h2>
//            <div class="user-actions"> <!-- Contenedor nuevo para organizar botones -->
//             <button class="change-password-btn" title="Cambiar contraseña">
//                 <i class="fas fa-key"></i> Cambiar contraseña
//             </button>
//             <button class="logout-btn" title="Cerrar sesión">
//                 <i class="fas fa-sign-out-alt"></i> Cerrar sesión
//             </button>
//         </div>
//             <p>Selecciona un condominio:</p>
//             <div class="condominios-list">
//                 ${condominios.map(condo => {
//                     const estaCaducado = new Date(condo.deleted_at) < new Date();
//                     return `
//                     <div class="condo-card ${estaCaducado ? 'expired' : ''}">
//                         <button class="condo-btn" 
//                             onclick="${estaCaducado ? '' : `seleccionarCondominio(${condo.id})`}"
//                             ${estaCaducado ? 'disabled' : ''}>
//                             ${condo.name}
//                         </button>
//                         <div class="condo-meta">
//                             <span class="expiry ${estaCaducado ? 'expired' : ''}">
//                                 Vigencia: ${formatearFecha(condo.deleted_at)}
//                             </span>
//                         </div>
//                     </div>
//                     `;
//                 }).join('')}
//             </div>
//             ${tieneCaducados ? `
//             <div class="renew-notice">
//                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
//                     <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="#D32F2F"/>
//                 </svg>
//                 <p>¿Condominio caducado? <strong>Renovaciones:</strong><br>
//                 <a href="tel:3331253000">33 3125 3000</a> • 
//                 <a href="https://wa.me/523318311824" target="_blank">WhatsApp</a></p>
//             </div>
//             ` : ''}
//         </div>
//     `;
    
//     // 3. Inyectamos la pre-sala después del body (o en un contenedor específico)
//     const mainContainer = document.body;
//     mainContainer.insertAdjacentHTML('beforeend', presalaHTML);
// }

// Función pa' cuando seleccione un condominio
function seleccionarCondominio(condoId) {
        const condominios = JSON.parse(sessionStorage.getItem('condominiosUsuario'));
    const condoSeleccionado = condominios.find(c => c.id === condoId);
    
    //console.log("Condominio seleccionado:", condoSeleccionado);
    sessionStorage.setItem('condominioSeleccionado', JSON.stringify(condoSeleccionado));
    
    window.location.href = `main.html`;
}

 // Delegación de eventos para el botón de logout (por ser dinámico)
document.body.addEventListener('click', (e) => {
    if (e.target.closest('.logout-btn')) {
        logoutCompleto();
    }
});

// Función mejorada de logout
function logoutCompleto() {
    // Limpiamos todos los datos
    sessionStorage.removeItem('condominioSeleccionado');
    sessionStorage.removeItem('condominiosUsuario');
    sessionStorage.removeItem('userData');
    
    // Recargamos la página para mostrar el formulario de login
    window.location.href = 'index.html';
    
    // Opcional: Forzar recarga completa si usas caché
    // window.location.reload(true);
}

// Agrega esto después de insertar la pre-sala (mismo scope de tu función)
document.body.addEventListener('click', (e) => {
    if (e.target.closest('.change-password-btn')) {

    Swal.fire({
        title: '🔐 Cambiar contraseña',
        html: `
            <input type="password" id="swalNewPass" class="swal2-input" placeholder="Nueva contraseña">
            <input type="password" id="swalConfirmPass" class="swal2-input" placeholder="Confirmar contraseña">
            <div id="swalPassError" class="text-red-500 text-sm mt-2"></div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Actualizar',
        cancelButtonText: 'Cancelar',
        background: '#1a1a1a',
        color: '#fff',
        backdrop: 'rgba(0,0,0,0.8)',
        confirmButtonColor: '#4CAF50',
        preConfirm: () => {
            const newPass = document.getElementById('swalNewPass').value;
            const confirmPass = document.getElementById('swalConfirmPass').value;
            const errorElement = document.getElementById('swalPassError');
            
            if (!newPass || !confirmPass) {
                errorElement.textContent = '⚠️ Rellena ambos campos';
                return false; // Evita que cierre el Swal
            }
            
            if (newPass !== confirmPass) {
                errorElement.textContent = '⚠️ Las contraseñas no coinciden';
                return false;
            }
            
            // Si todo está bien, retorna los datos para el fetch
            return { newPassword: newPass};
        }
    }).then((result) => {
        if (result.isConfirmed) {
            
            fetch(`${BACKEND_HOST}/api/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    id: usuarioGuardado.id,
                    newPassword: result.value.newPassword // 🔥 Corregido aquí
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: '¡Contraseña actualizada!',
                        text: 'Tu cambio se realizó con éxito',
                        timer: 2000,
                        showConfirmButton: false
                    });
                } else {
                    Swal.fire('Error', data.message || 'Algo salió mal', 'error');
                }
            })
            .catch(() => {
                Swal.fire('Error', 'No se pudo conectar al servidor', 'error');
            });
        }
    });
}});

// Mostrar modal al hacer clic en el enlace
document.getElementById('forgot-password-link').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('forgot-password-modal').style.display = 'block';
});


// Mostrar modal
document.getElementById('forgot-password-link').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('forgot-password-modal').style.display = 'flex'; // Cambiado a flex
});

// Cerrar modal al hacer clic en Cancelar
document.getElementById('cancel-btn').addEventListener('click', () => {
  document.getElementById('forgot-password-modal').style.display = 'none';
});

// Cerrar modal al hacer clic fuera del contenido
document.getElementById('forgot-password-modal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('forgot-password-modal')) {
    document.getElementById('forgot-password-modal').style.display = 'none';
  }
});

// Enviar email al backend
document.getElementById('forgot-password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('recovery-email').value;

  try {
    const response = await fetch(`${BACKEND_HOST}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (response.ok) {
      alert('¡Revisa tu correo para restablecer la contraseña!');
    } else {
      alert('Error: Correo no registrado.');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Algo salió mal. Intenta de nuevo.');
  }
});