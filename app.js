// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDz8CC9KMrQTx_PGgONd4kebhes4b-cQcs",
  authDomain: "gestionespese-21c91.firebaseapp.com",
  databaseURL: "https://gestionespese-21c91-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "gestionespese-21c91",
  storageBucket: "gestionespese-21c91.firebasestorage.app",
  messagingSenderId: "801958654193",
  appId: "1:801958654193:web:8cbc2a4350e8a253dcf950"
};

// Initialize Firebase
let database = null;
let firebaseInitialized = false;

try {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    firebaseInitialized = true;
    console.log('✅ Firebase connesso');
} catch (error) {
    console.log('⚠️ Firebase non disponibile');
    firebaseInitialized = false;
}

// Default categories
const defaultCategories = [
    { id: 'alimentari', name: 'Alimentari', icon: '🛒', color: '#F44336' },
    { id: 'trasporti', name: 'Trasporti', icon: '🚗', color: '#2196F3' },
    { id: 'casa', name: 'Casa', icon: '🏠', color: '#4CAF50' },
    { id: 'salute', name: 'Salute', icon: '💊', color: '#9C27B0' },
    { id: 'svago', name: 'Svago', icon: '🎮', color: '#FF9800' },
    { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#E91E63' },
];

// Global state
let currentMode = 'personal';
let expenses = [];
let customCategories = [];
let groupId = null;
let isListening = false;
let selectedCategory = 'alimentari';
let selectedColor = '#F44336';
let categoryChart = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setTodayDate();
    checkUrlForGroup();
    renderCategoryGrid();
    renderCustomCategories();
    setupSplitToggle();
    updateHeaderBalance();
});

// Split toggle
function setupSplitToggle() {
    const splitToggle = document.getElementById('isSplit');
    const splitIcon = document.getElementById('split-icon');
    const splitTitle = document.getElementById('split-title');
    const splitDesc = document.getElementById('split-desc');
    const paidForContainer = document.getElementById('paid-for-container');

    splitToggle.addEventListener('change', () => {
        if (splitToggle.checked) {
            splitIcon.textContent = '💰';
            splitTitle.textContent = 'Spesa Divisa';
            splitDesc.textContent = 'Costo diviso a metà';
            paidForContainer.style.display = 'none';
        } else {
            splitIcon.textContent = '👤';
            splitTitle.textContent = 'Spesa Personale';
            splitDesc.textContent = 'Pagata solo per una persona';
            paidForContainer.style.display = 'block';
        }
    });
}

// Mode switching
function switchMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    document.getElementById('shared-options').style.display = mode === 'shared' ? 'block' : 'none';
    document.getElementById('shared-settings').style.display = mode === 'shared' ? 'block' : 'none';
    
    // Mostra/nascondi bottone statistiche personali
    const personalNavBtn = document.getElementById('personal-nav-btn');
    if (personalNavBtn) {
        personalNavBtn.style.display = mode === 'shared' ? 'flex' : 'none';
    }
    
    if (isListening) stopListening();
    if (mode === 'shared' && groupId) startListening();
    
    updatePersonSelect();
    renderExpenseList();
    renderCharts();
    updateHeaderBalance();
    saveData();
}

// Tab switching
function switchTab(tab) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tab + '-tab').classList.add('active');
    
    if (tab === 'stats') {
        renderCharts();
    } else if (tab === 'personal') {
        // Render solo grafici personali
        if (currentMode === 'shared') {
            const filteredExpenses = expenses.filter(e => 
                e.mode === currentMode && (!groupId || e.groupId === groupId)
            );
            renderPersonalStats(filteredExpenses);
        }
    } else if (tab === 'categories') {
        renderCustomCategories();
    }
}

// Set today's date
function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
}

// Category grid
function renderCategoryGrid() {
    const grid = document.getElementById('category-grid');
    const allCategories = [...defaultCategories, ...customCategories];
    
    grid.innerHTML = allCategories.map(cat => `
        <div class="category-btn ${cat.id === selectedCategory ? 'selected' : ''}" 
             onclick="selectCategory('${cat.id}')">
            <div class="category-icon" style="background: ${cat.color}20; color: ${cat.color};">
                ${cat.icon}
            </div>
            <div class="category-name">${cat.name}</div>
        </div>
    `).join('');
}

function selectCategory(categoryId) {
    selectedCategory = categoryId;
    renderCategoryGrid();
}

// Add expense
document.getElementById('expense-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const isSplit = currentMode === 'shared' ? document.getElementById('isSplit').checked : true;
    const paidBy = currentMode === 'shared' ? document.getElementById('paidBy').value : null;
    const paidFor = (!isSplit && currentMode === 'shared') ? document.getElementById('paidFor').value : null;
    
    const expense = {
        id: Date.now(),
        description: document.getElementById('description').value,
        amount: parseFloat(document.getElementById('amount').value),
        category: selectedCategory,
        date: document.getElementById('date').value,
        paidBy: paidBy,
        isSplit: isSplit,
        paidFor: paidFor,
        mode: currentMode,
        groupId: groupId
    };
    
    expenses.push(expense);
    saveData();
    
    if (currentMode === 'shared' && groupId && firebaseInitialized) {
        await database.ref(`groups/${groupId}/expenses/${expense.id}`).set(expense);
    }
    
    document.getElementById('expense-form').reset();
    setTodayDate();
    selectedCategory = 'alimentari';
    renderCategoryGrid();
    document.getElementById('isSplit').checked = true;
    setupSplitToggle();
    
    renderExpenseList();
    renderCharts();
    updateHeaderBalance();
    
    showNotification('Spesa aggiunta! ✅');
    setTimeout(() => switchTab('list'), 500);
});

// Update header balance
function updateHeaderBalance() {
    const filteredExpenses = expenses.filter(e => 
        e.mode === currentMode && (!groupId || e.groupId === groupId)
    );
    const total = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    document.getElementById('header-balance').textContent = `€${total.toFixed(2)}`;
}

// Render expense list
function renderExpenseList() {
    const container = document.getElementById('expense-list');
    const filteredExpenses = expenses.filter(e => 
        e.mode === currentMode && (!groupId || e.groupId === groupId)
    );
    
    if (filteredExpenses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💸</div>
                <div class="empty-text">Nessuna spesa registrata</div>
            </div>
        `;
        return;
    }
    
    filteredExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    const allCategories = [...defaultCategories, ...customCategories];
    
    container.innerHTML = filteredExpenses.map(expense => {
        const category = allCategories.find(c => c.id === expense.category) || defaultCategories[0];
        const splitBadge = expense.isSplit 
            ? '<span class="split-badge shared">DIVISA</span>' 
            : '<span class="split-badge personal">PERSONALE</span>';
        
        return `
            <div class="expense-item">
                <div class="expense-icon-box" style="background: ${category.color}20; color: ${category.color};">
                    ${category.icon}
                </div>
                <div class="expense-details">
                    <div class="expense-description">${expense.description}</div>
                    <div class="expense-meta">
                        ${formatDate(expense.date)}
                        ${expense.paidBy ? ' • ' + getPersonName(expense.paidBy) : ''}
                        ${currentMode === 'shared' ? ' • ' + splitBadge : ''}
                    </div>
                </div>
                <div class="expense-amount-box">
                    <div class="expense-amount">€${expense.amount.toFixed(2)}</div>
                    <button class="delete-btn" onclick="deleteExpense(${expense.id})">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

// Delete expense
async function deleteExpense(id) {
    if (confirm('Eliminare questa spesa?')) {
        expenses = expenses.filter(e => e.id !== id);
        saveData();
        
        if (currentMode === 'shared' && groupId && firebaseInitialized) {
            await database.ref(`groups/${groupId}/expenses/${id}`).remove();
        }
        
        renderExpenseList();
        renderCharts();
        updateHeaderBalance();
        showNotification('Spesa eliminata');
    }
}

// Render charts
function renderCharts() {
    const filteredExpenses = expenses.filter(e => 
        e.mode === currentMode && (!groupId || e.groupId === groupId)
    );
    
    // Calcola SOLO spese divise per il totale
    const sharedExpenses = currentMode === 'shared' 
        ? filteredExpenses.filter(e => e.isSplit)
        : filteredExpenses;
    
    // Per il totale, mostriamo la somma delle spese divise (importo intero, non diviso per 2)
    const total = sharedExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    const totalEl = document.getElementById('total-expenses');
    const countEl = document.getElementById('count-expenses');
    if (totalEl) totalEl.textContent = `€${total.toFixed(2)}`;
    if (countEl) countEl.textContent = sharedExpenses.length;
    
    // Aggiorna titolo grafico generale
    const chartTitle = document.getElementById('chart-general-title');
    if (chartTitle) {
        chartTitle.textContent = currentMode === 'shared' 
            ? 'Spese Condivise (solo divise)'
            : 'Spese per Categoria';
    }
    
    renderCategoryChart(filteredExpenses);
    
    if (currentMode === 'shared') {
        renderBalance(filteredExpenses);
        // NON renderizziamo più i grafici personali qui, solo nella tab dedicata
    } else {
        document.getElementById('balance-section').innerHTML = '';
    }
}

function renderCategoryChart(filteredExpenses) {
    const categoryData = {};
    const allCategories = [...defaultCategories, ...customCategories];
    
    // Nel grafico generale mostriamo SOLO le spese divise
    const sharedExpenses = currentMode === 'shared' 
        ? filteredExpenses.filter(e => e.isSplit)
        : filteredExpenses;
    
    sharedExpenses.forEach(e => {
        categoryData[e.category] = (categoryData[e.category] || 0) + e.amount;
    });
    
    const ctx = document.getElementById('categoryChart');
    if (categoryChart) categoryChart.destroy();
    
    const labels = Object.keys(categoryData).map(catId => {
        const cat = allCategories.find(c => c.id === catId);
        return cat ? cat.icon + ' ' + cat.name : catId;
    });
    
    const colors = Object.keys(categoryData).map(catId => {
        const cat = allCategories.find(c => c.id === catId);
        return cat ? cat.color : '#999';
    });
    
    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: Object.values(categoryData),
                backgroundColor: colors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 10,
                        font: { size: 11, weight: '600' },
                        boxWidth: 12
                    }
                }
            }
        }
    });
}


// CORREZIONE COMPLETA renderBalance
function renderBalance(filteredExpenses) {
    // Calcola quanto EFFETTIVAMENTE deve pagare ciascuno
    const person1Should = filteredExpenses.reduce((sum, e) => {
        if (!e.isSplit) {
            return sum + (e.paidFor === 'person1' ? e.amount : 0);
        } else {
            return sum + (e.amount / 2);
        }
    }, 0);
    
    const person2Should = filteredExpenses.reduce((sum, e) => {
        if (!e.isSplit) {
            return sum + (e.paidFor === 'person2' ? e.amount : 0);
        } else {
            return sum + (e.amount / 2);
        }
    }, 0);
    
    // Calcola quanto ha EFFETTIVAMENTE pagato (per spese divise conta solo la metà)
    const person1PaidShared = filteredExpenses
        .filter(e => e.paidBy === 'person1' && e.isSplit)
        .reduce((sum, e) => sum + (e.amount / 2), 0);
    
    const person2PaidShared = filteredExpenses
        .filter(e => e.paidBy === 'person2' && e.isSplit)
        .reduce((sum, e) => sum + (e.amount / 2), 0);
    
    const balance = person1PaidShared - person1Should;
    
    const person1Name = localStorage.getItem('person1Name') || 'Persona 1';
    const person2Name = localStorage.getItem('person2Name') || 'Persona 2';
    
    let message, emoji;
    if (balance > 0.01) {
        message = `${person2Name} deve €${Math.abs(balance).toFixed(2)} a ${person1Name}`;
        emoji = '💰';
    } else if (balance < -0.01) {
        message = `${person1Name} deve €${Math.abs(balance).toFixed(2)} a ${person2Name}`;
        emoji = '💰';
    } else {
        message = 'Siete in pari!';
        emoji = '🎉';
    }
    
    document.getElementById('balance-section').innerHTML = `
        <div class="balance-card">
            <div class="balance-emoji">${emoji}</div>
            <div class="balance-message">${message}</div>
            <div class="balance-breakdown">
                ${person1Name} ha pagato: €${person1PaidShared.toFixed(2)}<br>
                ${person2Name} ha pagato: €${person2PaidShared.toFixed(2)}
            </div>
        </div>
    `;
}
function renderPersonalStats(filteredExpenses) {
    const person1Name = localStorage.getItem('person1Name') || 'Persona 1';
    const person2Name = localStorage.getItem('person2Name') || 'Persona 2';
    const allCategories = [...defaultCategories, ...customCategories];
    
    // Calculate person 1 stats
    const person1Data = calculatePersonStats(filteredExpenses, 'person1', allCategories);
    const person2Data = calculatePersonStats(filteredExpenses, 'person2', allCategories);
    
    document.getElementById('personal-stats-section').innerHTML = `
        <div class="section-header">👤 Grafici Personali</div>
        <div class="personal-stats-grid">
            ${renderPersonCard(person1Name, person1Data, 'person1')}
            ${renderPersonCard(person2Name, person2Data, 'person2')}
        </div>
    `;
    
    // Render charts for each person
    renderPersonChart('person1', person1Data.categoryData, allCategories);
    renderPersonChart('person2', person2Data.categoryData, allCategories);
}

function calculatePersonStats(expenses, person, allCategories) {
    const split = expenses.filter(e => e.isSplit).reduce((sum, e) => sum + (e.amount / 2), 0);
    const personal = expenses.filter(e => !e.isSplit && e.paidFor === person).reduce((sum, e) => sum + e.amount, 0);
    const total = split + personal;
    
    // Category breakdown
    const categoryData = {};
    expenses.forEach(e => {
        if (e.isSplit) {
            categoryData[e.category] = (categoryData[e.category] || 0) + (e.amount / 2);
        } else if (e.paidFor === person) {
            categoryData[e.category] = (categoryData[e.category] || 0) + e.amount;
        }
    });
    
    return { split, personal, total, categoryData };
}

function renderPersonCard(name, data, person) {
    return `
        <div class="person-stats-card">
            <div class="person-header">
                <div class="person-avatar">${name.charAt(0).toUpperCase()}</div>
                <div class="person-info">
                    <h3>${name}</h3>
                    <p>Riepilogo mensile</p>
                </div>
            </div>
            <div class="person-total">
                <div class="person-total-label">Totale Speso</div>
                <div class="person-total-amount">€${data.total.toFixed(2)}</div>
            </div>
            <div class="breakdown-grid">
                <div class="breakdown-item">
                    <div class="breakdown-value">€${data.split.toFixed(2)}</div>
                    <div class="breakdown-label">Divise</div>
                </div>
                <div class="breakdown-item">
                    <div class="breakdown-value">€${data.personal.toFixed(2)}</div>
                    <div class="breakdown-label">Personali</div>
                </div>
            </div>
            <div class="person-chart-container">
                <div class="person-chart-wrapper">
                    <div class="person-chart-title">Spese per Categoria</div>
                    <canvas id="chart-${person}" style="max-height: 200px;"></canvas>
                </div>
            </div>
        </div>
    `;
}

function renderPersonChart(person, categoryData, allCategories) {
    setTimeout(() => {
        const ctx = document.getElementById(`chart-${person}`);
        if (!ctx) return;
        
        const labels = Object.keys(categoryData).map(catId => {
            const cat = allCategories.find(c => c.id === catId);
            return cat ? cat.icon + ' ' + cat.name : catId;
        });
        
        const colors = Object.keys(categoryData).map(catId => {
            const cat = allCategories.find(c => c.id === catId);
            return cat ? cat.color : '#999';
        });
        
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: Object.values(categoryData),
                    backgroundColor: colors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 8,
                            font: { size: 10, weight: '600' },
                            boxWidth: 10
                        }
                    }
                }
            }
        });
    }, 100);
}

// Custom categories
let selectedIcon = '';
let currentIconTab = 'preset';

function switchIconTab(tab) {
    currentIconTab = tab;
    document.querySelectorAll('.icon-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    if (tab === 'preset') {
        document.getElementById('preset-icons').style.display = 'grid';
        document.getElementById('custom-icon').style.display = 'none';
    } else {
        document.getElementById('preset-icons').style.display = 'none';
        document.getElementById('custom-icon').style.display = 'block';
    }
}

function selectPresetIcon(icon) {
    selectedIcon = icon;
    document.querySelectorAll('.icon-preset-item').forEach(item => {
        item.classList.remove('selected');
    });
    event.target.classList.add('selected');
}

function showAddCategoryModal() {
    selectedIcon = '';
    currentIconTab = 'preset';
    document.getElementById('add-category-modal').classList.add('show');
    document.getElementById('preset-icons').style.display = 'grid';
    document.getElementById('custom-icon').style.display = 'none';
    document.querySelectorAll('.icon-tab')[0].classList.add('active');
    document.querySelectorAll('.icon-tab')[1].classList.remove('active');
    document.querySelectorAll('.icon-preset-item').forEach(item => item.classList.remove('selected'));
    
    document.querySelectorAll('.color-option').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            selectedColor = opt.dataset.color;
        });
    });
}

function closeAddCategoryModal() {
    document.getElementById('add-category-modal').classList.remove('show');
    document.getElementById('new-category-name').value = '';
    document.getElementById('new-category-icon').value = '';
}

function addCustomCategory() {
    const name = document.getElementById('new-category-name').value.trim();
    let icon;
    
    if (currentIconTab === 'preset') {
        icon = selectedIcon;
        if (!icon) {
            showNotification('Seleziona un\'icona!', 'error');
            return;
        }
    } else {
        icon = document.getElementById('new-category-icon').value.trim();
    }
    
    if (!name || !icon) {
        showNotification('Inserisci nome e icona!', 'error');
        return;
    }
    
    customCategories.push({
        id: 'custom_' + Date.now(),
        name: name,
        icon: icon,
        color: selectedColor
    });
    
    saveData();
    renderCategoryGrid();
    renderCustomCategories();
    closeAddCategoryModal();
    showNotification('Categoria aggiunta! ✅');
}

function renderCustomCategories() {
    const container = document.getElementById('custom-categories-list');
    if (customCategories.length === 0) {
        container.innerHTML = '<p style="color: #9E9E9E; text-align: center; padding: 20px; font-size: 14px;">Nessuna categoria personalizzata</p>';
        return;
    }
    
    container.innerHTML = customCategories.map(cat => `
        <div class="expense-item" style="margin-top: 10px;">
            <div class="expense-icon-box" style="background: ${cat.color}20; color: ${cat.color};">
                ${cat.icon}
            </div>
            <div class="expense-details">
                <div class="expense-description">${cat.name}</div>
                <div class="expense-meta">Categoria personalizzata</div>
            </div>
            <div class="expense-amount-box">
                <button class="delete-btn" onclick="deleteCustomCategory('${cat.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function deleteCustomCategory(id) {
    if (confirm('Eliminare questa categoria?')) {
        customCategories = customCategories.filter(c => c.id !== id);
        saveData();
        renderCategoryGrid();
        renderCustomCategories();
        showNotification('Categoria eliminata');
    }
}

// Shared functions
function saveNames() {
    const person1 = document.getElementById('person1-name').value;
    const person2 = document.getElementById('person2-name').value;
    
    if (!person1 || !person2) {
        showNotification('Inserisci entrambi i nomi!', 'error');
        return;
    }
    
    localStorage.setItem('person1Name', person1);
    localStorage.setItem('person2Name', person2);
    
    if (groupId && firebaseInitialized) {
        database.ref(`groups/${groupId}/names`).set({ person1, person2 });
    }
    
    updatePersonSelect();
    showNotification('Nomi salvati! ✅');
}

function updatePersonSelect() {
    const person1Name = localStorage.getItem('person1Name') || 'Persona 1';
    const person2Name = localStorage.getItem('person2Name') || 'Persona 2';
    const options = `
        <option value="person1">${person1Name}</option>
        <option value="person2">${person2Name}</option>
    `;
    document.getElementById('paidBy').innerHTML = options;
    document.getElementById('paidFor').innerHTML = options;
    document.getElementById('person1-name').value = person1Name;
    document.getElementById('person2-name').value = person2Name;
}

async function createGroup() {
    groupId = 'group_' + Math.random().toString(36).substring(2, 15) + Date.now();
    localStorage.setItem('groupId', groupId);
    
    if (firebaseInitialized) {
        await database.ref(`groups/${groupId}`).set({
            created: Date.now(),
            names: {
                person1: localStorage.getItem('person1Name') || 'Persona 1',
                person2: localStorage.getItem('person2Name') || 'Persona 2'
            },
            expenses: {}
        });
    }
    
    const url = window.location.origin + window.location.pathname + '?group=' + groupId;
    document.getElementById('share-link').textContent = url;
    document.getElementById('share-link-container').style.display = 'block';
    startListening();
    showNotification('Gruppo creato! ✅');
}

function copyLink() {
    const link = document.getElementById('share-link').textContent;
    navigator.clipboard.writeText(link).then(() => {
        showNotification('Link copiato! 📋');
    });
}

async function checkUrlForGroup() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlGroupId = urlParams.get('group');
    
    if (urlGroupId) {
        groupId = urlGroupId;
        localStorage.setItem('groupId', groupId);
        
        if (firebaseInitialized) {
            const snapshot = await database.ref(`groups/${groupId}/names`).once('value');
            const names = snapshot.val();
            if (names) {
                localStorage.setItem('person1Name', names.person1);
                localStorage.setItem('person2Name', names.person2);
            }
        }
        
        currentMode = 'shared';
        document.querySelectorAll('.mode-btn')[1].click();
        startListening();
        showNotification('Gruppo connesso! 🎉');
    } else {
        groupId = localStorage.getItem('groupId');
        if (groupId && currentMode === 'shared') startListening();
    }
}

function startListening() {
    if (!firebaseInitialized || !groupId || isListening) return;
    isListening = true;
    
    database.ref(`groups/${groupId}/expenses`).on('value', (snapshot) => {
        const firebaseExpenses = snapshot.val();
        if (firebaseExpenses) {
            const newExpenses = Object.values(firebaseExpenses);
            if (JSON.stringify(newExpenses) !== JSON.stringify(expenses)) {
                expenses = newExpenses;
                saveData();
                renderExpenseList();
                renderCharts();
                updateHeaderBalance();
            }
        }
    });
}

function stopListening() {
    if (firebaseInitialized && groupId) {
        database.ref(`groups/${groupId}/expenses`).off();
    }
    isListening = false;
}

// Data management
function saveData() {
    localStorage.setItem('expenses', JSON.stringify(expenses));
    localStorage.setItem('customCategories', JSON.stringify(customCategories));
    localStorage.setItem('currentMode', currentMode);
}

function loadData() {
    const saved = localStorage.getItem('expenses');
    if (saved) expenses = JSON.parse(saved);
    
    const savedCategories = localStorage.getItem('customCategories');
    if (savedCategories) customCategories = JSON.parse(savedCategories);
    
    const savedMode = localStorage.getItem('currentMode');
    if (savedMode) {
        currentMode = savedMode;
        if (savedMode === 'shared') document.querySelectorAll('.mode-btn')[1].click();
    }
    
    updatePersonSelect();
    renderExpenseList();
}

function exportData() {
    const dataStr = JSON.stringify({ expenses, customCategories }, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'spese_' + new Date().toISOString().split('T')[0] + '.json';
    link.click();
    showNotification('Dati esportati! 📥');
}

function clearAllData() {
    if (confirm('Cancellare TUTTI i dati?')) {
        expenses = [];
        customCategories = [];
        localStorage.clear();
        saveData();
        renderExpenseList();
        renderCharts();
        renderCustomCategories();
        updateHeaderBalance();
        showNotification('Dati cancellati');
    }
}

// Utilities
function getPersonName(person) {
    return person === 'person1' 
        ? localStorage.getItem('person1Name') || 'Persona 1'
        : localStorage.getItem('person2Name') || 'Persona 2';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

function showNotification(message) {
    const existing = document.querySelector('.notification-toast');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = 'notification-toast';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
