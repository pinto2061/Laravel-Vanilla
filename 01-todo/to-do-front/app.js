// Estado del host de la API
let API_HOST = localStorage.getItem('api_host') || 'http://to-do-api.test/api';

// Estado de la aplicación
let state = {
    tasks: [],
    currentPage: 1,
    totalPages: 1,
    perPage: 10,
    statusFilter: 'all',
    searchQuery: '',
    selectedTaskId: null,
    isLoading: false
};

// Elementos del DOM
const taskList = document.getElementById('taskList');
const searchInput = document.getElementById('searchInput');
const filterTabs = document.getElementById('filterTabs');
const paginationInfo = document.getElementById('paginationInfo');
const btnPrevPage = document.getElementById('btnPrevPage');
const btnNextPage = document.getElementById('btnNextPage');
const btnNewTask = document.getElementById('btnNewTask');
const btnWelcomeCreate = document.getElementById('btnWelcomeCreate');
const mainContent = document.getElementById('mainContent');
const brandLogo = document.querySelector('.brand');

// Paneles de vistas
const welcomePanel = document.getElementById('welcomePanel');
const detailsPanel = document.getElementById('detailsPanel');
const formPanel = document.getElementById('formPanel');

// Elementos del panel de detalles
const detailsTitle = document.getElementById('detailsTitle');
const detailsCreatedAt = document.getElementById('detailsCreatedAt');
const detailsUpdatedAt = document.getElementById('detailsUpdatedAt');
const detailsStatusBadge = document.getElementById('detailsStatusBadge');
const detailsStatusSelect = document.getElementById('detailsStatusSelect');
const detailsDescription = document.getElementById('detailsDescription');
const btnDeleteTask = document.getElementById('btnDeleteTask');
const btnEditTask = document.getElementById('btnEditTask');

// Elementos del panel del formulario
const formTitle = document.getElementById('formTitle');
const taskForm = document.getElementById('taskForm');
const formTaskId = document.getElementById('formTaskId');
const formInputTitle = document.getElementById('formInputTitle');
const formSelectStatus = document.getElementById('formSelectStatus');
const formTextareaDesc = document.getElementById('formTextareaDesc');
const btnCancelForm = document.getElementById('btnCancelForm');

// Elementos del modal de configuración de la API
const apiConfigBtn = document.getElementById('apiConfigBtn');
const apiConfigModal = document.getElementById('apiConfigModal');
const apiConfigClose = document.getElementById('apiConfigClose');
const apiHostInput = document.getElementById('apiHostInput');
const btnCancelApiConfig = document.getElementById('btnCancelApiConfig');
const btnSaveApiConfig = document.getElementById('btnSaveApiConfig');

// Contenedor de notificaciones toast
const toastContainer = document.getElementById('toastContainer');

// --- NOTIFICACIONES TOAST ---
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' 
        ? '<i class="fa-solid fa-circle-check" style="color: var(--toast-success)"></i>' 
        : '<i class="fa-solid fa-circle-xmark" style="color: var(--toast-error)"></i>';
        
    toast.innerHTML = `${icon} <span>${message}</span>`;
    toastContainer.appendChild(toast);
    
    // Desvanecer y eliminar
    setTimeout(() => {
        toast.classList.add('toast-fade-out');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3000);
}

// --- CONTROLADOR DE VISTAS ---
function showView(viewName) {
    welcomePanel.style.display = 'none';
    detailsPanel.style.display = 'none';
    formPanel.style.display = 'none';
    
    if (viewName === 'welcome') {
        welcomePanel.style.display = 'flex';
        state.selectedTaskId = null;
        updateActiveTaskCard();
    } else if (viewName === 'details') {
        detailsPanel.style.display = 'block';
    } else if (viewName === 'form') {
        formPanel.style.display = 'block';
    }
}

// --- ACCIONES DE LA API ---
async function fetchTasks() {
    state.isLoading = true;
    renderSkeletons();
    
    // Construir parámetros de consulta
    let url = `${API_HOST}/tasks?page=${state.currentPage}&per_page=${state.perPage}`;
    if (state.statusFilter !== 'all') {
        url += `&status=${encodeURIComponent(state.statusFilter)}`;
    }
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al obtener las tareas');
        
        const data = await response.json();
        
        state.tasks = data.data || [];
        state.currentPage = data.current_page || 1;
        state.totalPages = data.last_page || 1;
        
        renderTaskList();
        renderPagination(data);
    } catch (error) {
        console.error(error);
        taskList.innerHTML = `
            <div class="list-empty-state">
                <i class="fa-solid fa-triangle-exclamation" style="color: var(--toast-error)"></i>
                <p>No se pudo conectar con la API.</p>
                <small style="color: var(--text-muted)">Verifica el host de la API en la configuración (icono de engranaje).</small>
            </div>
        `;
        paginationInfo.textContent = "Error de conexión";
        btnPrevPage.disabled = true;
        btnNextPage.disabled = true;
        showToast('Error de conexión con el servidor API', 'error');
    } finally {
        state.isLoading = false;
    }
}

async function getTaskDetails(id) {
    try {
        const response = await fetch(`${API_HOST}/task/${id}`);
        if (!response.ok) throw new Error('No se pudo obtener la tarea');
        
        const task = await response.json();
        renderTaskDetails(task);
    } catch (error) {
        showToast('Error al cargar detalles de la tarea', 'error');
        showView('welcome');
    }
}

async function saveTask(taskData) {
    const isEdit = !!taskData.id;
    const url = isEdit ? `${API_HOST}/task/${taskData.id}` : `${API_HOST}/task`;
    const method = isEdit ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(taskData)
        });
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || 'Error al guardar la tarea');
        }
        
        const savedTask = await response.json();
        showToast(isEdit ? 'Tarea actualizada correctamente' : 'Tarea creada correctamente', 'success');
        
        // Recargar la lista de tareas
        if (!isEdit) {
            // Ir a la primera página para ver la tarea recién creada (ya que el backend ordena por más reciente)
            state.currentPage = 1;
        }
        
        await fetchTasks();
        
        // Mostrar detalles de la tarea guardada
        state.selectedTaskId = savedTask.id;
        renderTaskDetails(savedTask);
        showView('details');
        
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function deleteTask(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta tarea?')) return;
    
    try {
        const response = await fetch(`${API_HOST}/task/${id}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Error al eliminar la tarea');
        
        showToast('Tarea eliminada correctamente', 'success');
        showView('welcome');
        fetchTasks();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function updateStatusDirectly(id, newStatus) {
    try {
        const response = await fetch(`${API_HOST}/task/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (!response.ok) throw new Error('Error al actualizar el estatus');
        
        const updatedTask = await response.json();
        showToast('Estatus actualizado', 'success');
        
        // Recarga silenciosa de la lista de tareas (sin reiniciar los esqueletos de carga) para mantener la UI responsiva
        const listResponse = await fetch(`${API_HOST}/tasks?page=${state.currentPage}&per_page=${state.perPage}${state.statusFilter !== 'all' ? `&status=${encodeURIComponent(state.statusFilter)}` : ''}`);
        if (listResponse.ok) {
            const listData = await listResponse.json();
            state.tasks = listData.data || [];
            renderTaskList();
        }
        
        renderTaskDetails(updatedTask);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// --- FUNCIONES DE RENDERIZADO ---
function renderSkeletons() {
    taskList.innerHTML = '';
    for (let i = 0; i < 4; i++) {
        taskList.innerHTML += `
            <div class="task-card skeleton">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.5rem;">
                    <div class="skeleton-title skeleton" style="width: 60%; margin-bottom: 0;"></div>
                    <div class="skeleton-badge skeleton" style="width: 70px;"></div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div class="skeleton-text skeleton" style="width: 25%; margin-bottom: 0;"></div>
                </div>
            </div>
        `;
    }
}

function renderTaskList() {
    taskList.innerHTML = '';
    
    // Aplicar filtro de búsqueda del lado del cliente
    const filteredTasks = state.tasks.filter(task => {
        const query = state.searchQuery.toLowerCase().trim();
        if (!query) return true;
        return (
            task.titulo.toLowerCase().includes(query) ||
            task.descripcion.toLowerCase().includes(query)
        );
    });
    
    if (filteredTasks.length === 0) {
        taskList.innerHTML = `
            <div class="list-empty-state">
                <i class="fa-regular fa-folder-open"></i>
                <p>${state.searchQuery ? 'No se encontraron resultados' : 'No hay tareas disponibles'}</p>
            </div>
        `;
        return;
    }
    
    filteredTasks.forEach(task => {
        const card = document.createElement('div');
        card.className = `task-card ${state.selectedTaskId === task.id ? 'active' : ''}`;
        card.dataset.id = task.id;
        
        const formattedDate = formatDate(task.created_at);
        
        card.innerHTML = `
            <div class="card-header">
                <h4 class="card-title" title="${escapeHTML(task.titulo)}">${escapeHTML(task.titulo)}</h4>
                <span class="badge badge-${getBadgeClass(task.status)}">${escapeHTML(task.status)}</span>
            </div>
            <div class="card-footer">
                <span>${formattedDate}</span>
            </div>
        `;
        
        card.addEventListener('click', () => {
            state.selectedTaskId = task.id;
            updateActiveTaskCard();
            getTaskDetails(task.id);
        });
        
        taskList.appendChild(card);
    });
}

function updateActiveTaskCard() {
    document.querySelectorAll('.task-card').forEach(card => {
        if (parseInt(card.dataset.id) === state.selectedTaskId) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });
}

function renderPagination(apiResponse) {
    const total = apiResponse.total || 0;
    const from = apiResponse.from || 0;
    const to = apiResponse.to || 0;
    
    if (total === 0) {
        paginationInfo.textContent = 'Sin tareas';
        btnPrevPage.disabled = true;
        btnNextPage.disabled = true;
        return;
    }
    
    paginationInfo.textContent = `${from}-${to} de ${total}`;
    
    btnPrevPage.disabled = state.currentPage <= 1;
    btnNextPage.disabled = state.currentPage >= state.totalPages;
}

function renderTaskDetails(task) {
    detailsTitle.textContent = task.titulo;
    detailsCreatedAt.textContent = formatDate(task.created_at, true);
    detailsUpdatedAt.textContent = formatDate(task.updated_at, true);
    detailsDescription.textContent = task.descripcion || 'Sin descripción';
    
    // Etiqueta de estatus y selector
    detailsStatusBadge.className = `badge badge-${getBadgeClass(task.status)}`;
    detailsStatusBadge.textContent = task.status;
    
    detailsStatusSelect.value = task.status;
    
    // Almacenar selección activa en el dataset de los botones del panel de detalles
    btnDeleteTask.dataset.id = task.id;
    btnEditTask.dataset.id = task.id;
    
    showView('details');
}

// --- AYUDANTES / UTILIDADES ---
function getBadgeClass(status) {
    const cleaned = status ? status.toLowerCase() : '';
    if (cleaned === 'completada' || cleaned === 'completed') return 'completada';
    if (cleaned === 'en progreso' || cleaned === 'in progress') return 'en-progreso';
    return 'pendiente';
}

function formatDate(dateString, includeTime = false) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        if (includeTime) {
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${day}/${month}/${year} ${hours}:${minutes}`;
        }
        return `${day}/${month}/${year}`;
    } catch (e) {
        return dateString;
    }
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// --- MANEJADORES DE EVENTOS ---
function initEvents() {
    // Regresar a la vista de bienvenida al hacer clic en el logo
    brandLogo.addEventListener('click', () => {
        showView('welcome');
    });

    // Entrada de búsqueda (filtrado local para una respuesta de UI más rápida)
    searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        renderTaskList();
    });
    
    // Filtrado por pestañas
    filterTabs.addEventListener('click', (e) => {
        if (!e.target.classList.contains('tab')) return;
        
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        e.target.classList.add('active');
        
        state.statusFilter = e.target.dataset.status;
        state.currentPage = 1; // Reiniciar a la página 1 al cambiar el filtro
        fetchTasks();
    });
    
    // Botones de paginación
    btnPrevPage.addEventListener('click', () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            fetchTasks();
        }
    });
    
    btnNextPage.addEventListener('click', () => {
        if (state.currentPage < state.totalPages) {
            state.currentPage++;
            fetchTasks();
        }
    });
    
    // Acciones para crear tarea
    const triggerNewTask = () => {
        formTitle.textContent = 'Nueva Tarea';
        formTaskId.value = '';
        formInputTitle.value = '';
        formSelectStatus.value = 'pendiente';
        formTextareaDesc.value = '';
        showView('form');
    };
    
    btnNewTask.addEventListener('click', triggerNewTask);
    btnWelcomeCreate.addEventListener('click', triggerNewTask);
    
    btnCancelForm.addEventListener('click', () => {
        if (state.selectedTaskId) {
            showView('details');
        } else {
            showView('welcome');
        }
    });
    
    // Envío del formulario
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const taskData = {
            titulo: formInputTitle.value.trim(),
            status: formSelectStatus.value,
            descripcion: formTextareaDesc.value.trim()
        };
        
        const id = formTaskId.value;
        if (id) {
            taskData.id = parseInt(id);
        }
        
        saveTask(taskData);
    });
    
    // Cambios en el selector de estatus de detalles
    detailsStatusSelect.addEventListener('change', (e) => {
        if (state.selectedTaskId) {
            updateStatusDirectly(state.selectedTaskId, e.target.value);
        }
    });
    
    // Acción de editar en detalles
    btnEditTask.addEventListener('click', () => {
        const activeTask = state.tasks.find(t => t.id === state.selectedTaskId);
        if (!activeTask) return;
        
        formTitle.textContent = 'Editar Tarea';
        formTaskId.value = activeTask.id;
        formInputTitle.value = activeTask.titulo;
        formSelectStatus.value = activeTask.status;
        formTextareaDesc.value = activeTask.descripcion || '';
        
        showView('form');
    });
    
    // Acción de eliminar en detalles
    btnDeleteTask.addEventListener('click', () => {
        if (state.selectedTaskId) {
            deleteTask(state.selectedTaskId);
        }
    });
    
    // --- Disparadores del modal de configuración de la API ---
    apiConfigBtn.addEventListener('click', () => {
        apiHostInput.value = API_HOST;
        apiConfigModal.classList.add('active');
    });
    
    const closeApiModal = () => {
        apiConfigModal.classList.remove('active');
    };
    
    apiConfigClose.addEventListener('click', closeApiModal);
    btnCancelApiConfig.addEventListener('click', closeApiModal);
    
    btnSaveApiConfig.addEventListener('click', () => {
        let newHost = apiHostInput.value.trim();
        // Remove trailing slash if present
        if (newHost.endsWith('/')) {
            newHost = newHost.slice(0, -1);
        }
        
        if (newHost) {
            API_HOST = newHost;
            localStorage.setItem('api_host', newHost);
            showToast('API Host actualizado', 'success');
            closeApiModal();
            // Recargar tareas con el nuevo host de la API
            state.currentPage = 1;
            fetchTasks();
            showView('welcome');
        } else {
            showToast('El Host de la API no puede estar vacío', 'error');
        }
    });
    
    // Cerrar modal haciendo clic fuera de la tarjeta
    apiConfigModal.addEventListener('click', (e) => {
        if (e.target === apiConfigModal) {
            closeApiModal();
        }
    });
}

// --- INICIALIZACIÓN DE LA APLICACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    initEvents();
    fetchTasks();
    showView('welcome');
});
