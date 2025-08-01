document.addEventListener('DOMContentLoaded', () => {
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
});