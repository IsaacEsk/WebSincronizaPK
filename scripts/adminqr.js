const BACKEND_HOST = 'http://localhost:3000';

//const BACKEND_HOST = 'https://sincronizapkbackend.onrender.com';


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

document.addEventListener('DOMContentLoaded', async () => {

    // Elementos del DOM
    const contenedorKnovo = document.getElementById('contenedor-knovo');
    const cardsContainer = document.getElementById('cards-container');
    const adminqrHeader = document.querySelector('.adminqr-header');

    try {
        // Verificar si la tabla existe (si tiene el servicio)
        const response = await fetch(`${BACKEND_HOST}/api/check-table?tableName=residentesqr`);
        const result = await response.json();
        const hasService = result.data[0].exists; // true o false

        if (!hasService) {
            // Si tiene el servicio: MOSTRAR IFRAME y OCULTAR las cards y el header
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
        } else {
            // Si NO tiene el servicio: mostrar las cards normal (ya está visible por defecto)
            // Aquí puedes cargar tus cards como lo hacías originalmente
            loadCards(); // Esta función debería estar en tu código original
        }
    } catch (error) {
        console.error('Error verificando el servicio:', error);
        // En caso de error, mostramos las cards normales
        loadCards();
    }
});

// Función para cargar las cards (tu código original)
function loadCards() {
    const params = new URLSearchParams(window.location.search);
    const tipo = params.get('tipo') || 'aceptados'; // Ej: ?tipo=aceptados
    const tituloSeccion = document.getElementById('titulo-seccion');
    const buscador = document.getElementById('buscador-cards');
    const cardsContainer = document.getElementById('cards-container');

    // Actualizar título según el tipo
    const titulos = {
        aceptados: 'KNOVO - Aceptados',
        rechazados: 'KNOVO - Rechazados',
        pendientes: 'KNOVO - Pendientes'
    };
    tituloSeccion.textContent = titulos[tipo] || 'KNOVO';

    // Mock de datos (simulando backend)
    const mockPersonas = [
        // === ACEPTADOS (10) ===
        { nombre: "Juan Pérez", domicilio: "Calle 123, Casa 4", tipo: "aceptados" },
        { nombre: "María García", domicilio: "Avenida 456, Depto 12", tipo: "aceptados" },
        { nombre: "Luis Hernández", domicilio: "Boulevard Libertad 789", tipo: "aceptados" },
        { nombre: "Ana Martínez", domicilio: "Privada Roble 101", tipo: "aceptados" },
        { nombre: "Carlos Ramírez", domicilio: "Callejón del Sol 55", tipo: "aceptados" },
        { nombre: "Sofía Díaz", domicilio: "Avenida Central 200", tipo: "aceptados" },
        { nombre: "Roberto Jiménez", domicilio: "Cerro de la Luna 33", tipo: "aceptados" },
        { nombre: "Patricia Ruiz", domicilio: "Vía Láctea 12-A", tipo: "aceptados" },
        { nombre: "Jorge Mendoza", domicilio: "Paseo de los Pinos 78", tipo: "aceptados" },
        { nombre: "Lucía Castro", domicilio: "Rincón del Bosque 90", tipo: "aceptados" },

        // === RECHAZADOS (10) ===
        { nombre: "Carlos López", domicilio: "Boulevard 789, Casa 7", tipo: "rechazados" },
        { nombre: "Fernanda Ortega", domicilio: "Calle Falsa 123", tipo: "rechazados" },
        { nombre: "Ricardo Núñez", domicilio: "Avenida Siempre Viva 404", tipo: "rechazados" },
        { nombre: "Daniela Solís", domicilio: "Privada del Trueno 66", tipo: "rechazados" },
        { nombre: "Oscar Torres", domicilio: "Camino Real 300", tipo: "rechazados" },
        { nombre: "Adriana Vázquez", domicilio: "Sendero del Viento 22", tipo: "rechazados" },
        { nombre: "Miguel Ángel Reyes", domicilio: "Loma Bonita 45", tipo: "rechazados" },
        { nombre: "Elena Moreno", domicilio: "Callejón del Beso 15", tipo: "rechazados" },
        { nombre: "Raúl Guerrero", domicilio: "Vereda del Río 88", tipo: "rechazados" },
        { nombre: "Isabel Flores", domicilio: "Paso de la Montaña 77", tipo: "rechazados" },

        // === PENDIENTES (10) ===
        { nombre: "Ana Martínez", domicilio: "Privada 101, Casa 2", tipo: "pendientes" },
        { nombre: "Pedro Sánchez", domicilio: "Avenida Revolución 500", tipo: "pendientes" },
        { nombre: "Gabriela Ríos", domicilio: "Calle del Arte 123", tipo: "pendientes" },
        { nombre: "Manuel Delgado", domicilio: "Circuito Jardín 34", tipo: "pendientes" },
        { nombre: "Laura Méndez", domicilio: "Prolongación Juárez 67", tipo: "pendientes" },
        { nombre: "José Luis Orozco", domicilio: "Cerrada del Valle 89", tipo: "pendientes" },
        { nombre: "Diana Paredes", domicilio: "Vía Rápida 12", tipo: "pendientes" },
        { nombre: "Francisco Vega", domicilio: "Camino Viejo 56", tipo: "pendientes" },
        { nombre: "Alejandra Campos", domicilio: "Ronda de los Lagos 23", tipo: "pendientes" },
        { nombre: "Arturo Navarro", domicilio: "Calzada del Sol 11", tipo: "pendientes" }
    ];

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
            card.innerHTML = `
                <h3>${persona.nombre}</h3>
                <p><strong>Domicilio:</strong> ${persona.domicilio}</p>
            `;
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

    // Mock inicial (simula carga async)
    setTimeout(() => {
        renderCards(mockPersonas);
    }, 1000);

}


// document.addEventListener('DOMContentLoaded', () => {
    
//     fetch(`${BACKEND_HOST}/api/check-table?tableName=residentesqr`)
//   .then(response => response.json())
//   .then(data => {
//     if (data.exists) {
//       // Mostrar el iframe o contenido para clientes con servicio
//       console.log("si se armo ");
//     } else {
//       // Mostrar algo para clientes sin servicio
//       console.log("no se armo ");
//     }
//   });

    
//     const params = new URLSearchParams(window.location.search);
//     const tipo = params.get('tipo') || 'aceptados'; // Ej: ?tipo=aceptados
//     const tituloSeccion = document.getElementById('titulo-seccion');
//     const buscador = document.getElementById('buscador-cards');
//     const cardsContainer = document.getElementById('cards-container');

//     // Actualizar título según el tipo
//     const titulos = {
//         aceptados: 'KNOVO - Aceptados',
//         rechazados: 'KNOVO - Rechazados',
//         pendientes: 'KNOVO - Pendientes'
//     };
//     tituloSeccion.textContent = titulos[tipo] || 'KNOVO';

//     // Mock de datos (simulando backend)
//     const mockPersonas = [
//         // === ACEPTADOS (10) ===
//         { nombre: "Juan Pérez", domicilio: "Calle 123, Casa 4", tipo: "aceptados" },
//         { nombre: "María García", domicilio: "Avenida 456, Depto 12", tipo: "aceptados" },
//         { nombre: "Luis Hernández", domicilio: "Boulevard Libertad 789", tipo: "aceptados" },
//         { nombre: "Ana Martínez", domicilio: "Privada Roble 101", tipo: "aceptados" },
//         { nombre: "Carlos Ramírez", domicilio: "Callejón del Sol 55", tipo: "aceptados" },
//         { nombre: "Sofía Díaz", domicilio: "Avenida Central 200", tipo: "aceptados" },
//         { nombre: "Roberto Jiménez", domicilio: "Cerro de la Luna 33", tipo: "aceptados" },
//         { nombre: "Patricia Ruiz", domicilio: "Vía Láctea 12-A", tipo: "aceptados" },
//         { nombre: "Jorge Mendoza", domicilio: "Paseo de los Pinos 78", tipo: "aceptados" },
//         { nombre: "Lucía Castro", domicilio: "Rincón del Bosque 90", tipo: "aceptados" },

//         // === RECHAZADOS (10) ===
//         { nombre: "Carlos López", domicilio: "Boulevard 789, Casa 7", tipo: "rechazados" },
//         { nombre: "Fernanda Ortega", domicilio: "Calle Falsa 123", tipo: "rechazados" },
//         { nombre: "Ricardo Núñez", domicilio: "Avenida Siempre Viva 404", tipo: "rechazados" },
//         { nombre: "Daniela Solís", domicilio: "Privada del Trueno 66", tipo: "rechazados" },
//         { nombre: "Oscar Torres", domicilio: "Camino Real 300", tipo: "rechazados" },
//         { nombre: "Adriana Vázquez", domicilio: "Sendero del Viento 22", tipo: "rechazados" },
//         { nombre: "Miguel Ángel Reyes", domicilio: "Loma Bonita 45", tipo: "rechazados" },
//         { nombre: "Elena Moreno", domicilio: "Callejón del Beso 15", tipo: "rechazados" },
//         { nombre: "Raúl Guerrero", domicilio: "Vereda del Río 88", tipo: "rechazados" },
//         { nombre: "Isabel Flores", domicilio: "Paso de la Montaña 77", tipo: "rechazados" },

//         // === PENDIENTES (10) ===
//         { nombre: "Ana Martínez", domicilio: "Privada 101, Casa 2", tipo: "pendientes" },
//         { nombre: "Pedro Sánchez", domicilio: "Avenida Revolución 500", tipo: "pendientes" },
//         { nombre: "Gabriela Ríos", domicilio: "Calle del Arte 123", tipo: "pendientes" },
//         { nombre: "Manuel Delgado", domicilio: "Circuito Jardín 34", tipo: "pendientes" },
//         { nombre: "Laura Méndez", domicilio: "Prolongación Juárez 67", tipo: "pendientes" },
//         { nombre: "José Luis Orozco", domicilio: "Cerrada del Valle 89", tipo: "pendientes" },
//         { nombre: "Diana Paredes", domicilio: "Vía Rápida 12", tipo: "pendientes" },
//         { nombre: "Francisco Vega", domicilio: "Camino Viejo 56", tipo: "pendientes" },
//         { nombre: "Alejandra Campos", domicilio: "Ronda de los Lagos 23", tipo: "pendientes" },
//         { nombre: "Arturo Navarro", domicilio: "Calzada del Sol 11", tipo: "pendientes" }
//     ];

//     // Filtrar y mostrar cards
//     function renderCards(personas) {
//         cardsContainer.innerHTML = '';
//         const filtradas = personas.filter(p => p.tipo === tipo);
        
//         if (filtradas.length === 0) {
//             cardsContainer.innerHTML = '<p class="no-data">No hay registros para mostrar.</p>';
//             return;
//         }

//         filtradas.forEach(persona => {
//             const card = document.createElement('div');
//             card.className = 'card';
//             card.innerHTML = `
//                 <h3>${persona.nombre}</h3>
//                 <p><strong>Domicilio:</strong> ${persona.domicilio}</p>
//             `;
//             cardsContainer.appendChild(card);
//         });
//     }

//     // Filtro de búsqueda
//     buscador.addEventListener('input', (e) => {
//         const texto = e.target.value.toLowerCase();
//         const cards = document.querySelectorAll('.card');
        
//         cards.forEach(card => {
//             const nombre = card.querySelector('h3').textContent.toLowerCase();
//             const domicilio = card.querySelector('p').textContent.toLowerCase();
//             const coincide = nombre.includes(texto) || domicilio.includes(texto);
//             card.style.display = coincide ? 'block' : 'none';
//         });
//     });

//     // Mock inicial (simula carga async)
//     setTimeout(() => {
//         renderCards(mockPersonas);
//     }, 1000);
// });