document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DO DOM ---
    const connectBtn = document.getElementById('connect-btn');
    const disconnectBtn = document.getElementById('disconnect-btn');
    const refreshQrBtn = document.getElementById('refresh-qr-btn');
    const qrcodeContainer = document.getElementById('qrcode-container');
    const connectionStatusText = document.getElementById('connection-status-text');
    const instanceStatusDetail = document.getElementById('instance-status-detail');
    const statusDot = document.getElementById('status-dot');
    const qrcodeDiv = document.getElementById('qrcode');
    const connectionButtons = document.getElementById('connection-buttons');
    const connectedInfo = document.getElementById('connected-info');
    
    const fileInput = document.getElementById('file-input');
    const fileDropArea = document.getElementById('file-drop-area');
    const fileSelected = document.getElementById('file-selected');
    const fileName = document.getElementById('file-name');
    const contactsCount = document.getElementById('contacts-count');
    const messageText = document.getElementById('message-text');
    const sendBtn = document.getElementById('send-btn');
    const previewBtn = document.getElementById('preview-btn');
    const contactsTableBody = document.getElementById('contacts-table-body');
    const contactsTableContainer = document.getElementById('contacts-table-container');
    const logsContent = document.getElementById('logs-content');
    const sendProgress = document.getElementById('send-progress');
    const progressText = document.getElementById('progress-text');
    const progressPercent = document.getElementById('progress-percent');
    const delayTimeInput = document.getElementById('delay-time');

    const cards = {
        connection: document.getElementById('connection-card'),
        contacts: document.getElementById('contacts-card'),
        message: document.getElementById('message-card'),
        send: document.getElementById('send-card')
    };

    const steps = {
        1: document.getElementById('step-1'),
        2: document.getElementById('step-2'),
        3: document.getElementById('step-3'),
        4: document.getElementById('step-4')
    };

    // --- CONFIGURAÇÕES DA API ---
    const API_URL = 'https://tess-evolution-api.1hldwq.easypanel.host';
    const API_KEY = '429683C4C977415CAAFCCE10F7D57E11';
    const INSTANCE_NAME = 'c118c9b2-93e5-4b16-92ab-484358820795';

    let contacts = [];
    let connectionCheckInterval = null;
    let isConnected = false;

    // --- FUNÇÕES DE LOG ---
    const addLog = (message, type = 'info') => {
        const timeString = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = `<span class="log-time">${timeString}</span> <span class="log-${type}">${message}</span>`;
        logsContent.appendChild(logEntry);
        logsContent.scrollTop = logsContent.scrollHeight;
        console.log(`[${timeString}] [${type.toUpperCase()}] ${message}`);
    };
    
    document.getElementById('current-time').textContent = new Date().toLocaleTimeString();

    // --- FUNÇÕES DE NAVEGAÇÃO (STEPS) ---
    const showStep = (stepNumber) => {
        Object.values(steps).forEach(step => step.classList.remove('active', 'completed'));
        Object.values(cards).forEach(card => card.classList.add('hidden'));

        for (let i = 1; i <= stepNumber; i++) {
            if (steps[i]) {
                steps[i].classList.add(i < stepNumber ? 'completed' : 'active');
            }
        }
        
        switch(stepNumber) {
            case 1: cards.connection.classList.remove('hidden'); break;
            case 2: cards.contacts.classList.remove('hidden'); break;
            case 3: cards.message.classList.remove('hidden'); break;
            case 4: cards.send.classList.remove('hidden'); break;
        }
    };

    // --- FUNÇÕES DE CONEXÃO ---
    const updateConnectionStatusUI = (status, detail = '') => {
        connectionStatusText.textContent = status;
        instanceStatusDetail.textContent = detail;
        statusDot.className = 'status-dot';

        switch (status) {
            case 'Conectado':
                statusDot.classList.add('connected');
                isConnected = true;
                connectionButtons.classList.add('hidden');
                qrcodeContainer.classList.add('hidden');
                connectedInfo.classList.remove('hidden');
                clearInterval(connectionCheckInterval);
                connectionCheckInterval = null;
                showStep(2);
                break;
            case 'Conectando':
            case 'Aguardando QR Code':
                statusDot.classList.add('connecting');
                isConnected = false;
                connectionButtons.classList.add('hidden');
                qrcodeContainer.classList.remove('hidden');
                connectedInfo.classList.add('hidden');
                break;
            case 'Desconectado':
            case 'Erro':
            default:
                if (status === 'Erro') statusDot.classList.add('error');
                isConnected = false;
                connectionButtons.classList.remove('hidden');
                qrcodeContainer.classList.add('hidden');
                connectedInfo.classList.add('hidden');
                if (connectionCheckInterval) {
                    clearInterval(connectionCheckInterval);
                    connectionCheckInterval = null;
                }
                showStep(1);
                break;
        }
    };

    const fetchQRCode = async () => {
        try {
            addLog('Solicitando QR Code...');
            updateConnectionStatusUI('Conectando', 'Gerando QR Code...');
            const response = await fetch(`${API_URL}/instance/connect/${INSTANCE_NAME}`, {
                headers: { 'apikey': API_KEY }
            });
            if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
            const data = await response.json();
            addLog(`Resposta (connect): ${JSON.stringify(data)}`, 'info');
            
            // CORREÇÃO: A resposta da API envia o 'base64' no nível raiz do objeto,
            // e não dentro de um objeto 'qrcode'. A verificação foi ajustada para data.base64.
            if (data.base64) {
                const imgSrc = data.base64.startsWith('data:image/png;base64,') ? data.base64 : `data:image/png;base64,${data.base64}`;
                qrcodeDiv.innerHTML = `<img src="${imgSrc}" alt="QR Code">`;
                updateConnectionStatusUI('Aguardando QR Code', 'Leia o QR Code com seu WhatsApp.');
            } else {
                throw new Error('QR Code não recebido da API.');
            }
        } catch(error) {
            addLog(`Falha ao buscar QR Code: ${error.message}`, 'error');
            qrcodeDiv.innerHTML = `<p style="color: var(--error-color);">Não foi possível carregar o QR Code.</p>`;
            updateConnectionStatusUI('Erro', 'Falha ao carregar QR Code.');
        }
    };

    const checkConnectionState = async () => {
        addLog('Verificando status da conexão...');
        try {
            const response = await fetch(`${API_URL}/instance/connectionState/${INSTANCE_NAME}`, {
                method: 'GET',
                headers: { 'apikey': API_KEY }
            });
            if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
            const data = await response.json();
            addLog(`Resposta (connectionState): ${JSON.stringify(data)}`, 'info');

            if (data.instance?.state === 'open') {
                addLog('Instância conectada!', 'info');
                updateConnectionStatusUI('Conectado');
            } else {
                 addLog(`Status da instância: ${data.instance?.state}`, 'warning');
            }
        } catch (error) {
            addLog(`Erro ao verificar status da conexão: ${error.message}`, 'error');
            updateConnectionStatusUI('Erro', 'Não foi possível verificar o status.');
        }
    };

    connectBtn.addEventListener('click', () => {
        fetchQRCode();
        if (!connectionCheckInterval) {
            connectionCheckInterval = setInterval(checkConnectionState, 10000);
        }
    });
    
    refreshQrBtn.addEventListener('click', fetchQRCode);

    disconnectBtn.addEventListener('click', async () => {
        addLog('Iniciando desconexão...', 'warning');
        updateConnectionStatusUI('Desconectado', 'Desconectando instância...');
        try {
            const response = await fetch(`${API_URL}/instance/logout/${INSTANCE_NAME}`, {
                method: 'DELETE',
                headers: { 'apikey': API_KEY }
            });
            if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
            const data = await response.json();
            addLog(`Resposta (logout): ${JSON.stringify(data)}`, 'info');

            if(data.instance?.state === 'close') {
                addLog('Instância desconectada com sucesso.', 'info');
                updateConnectionStatusUI('Desconectado', 'Sessão encerrada.');
            } else {
                 throw new Error('A API não confirmou a desconexão.');
            }
        } catch (error) {
             addLog(`Erro ao desconectar: ${error.message}`, 'error');
             updateConnectionStatusUI('Erro', 'Falha ao desconectar. Verifique a API.');
        }
    });

    // --- FUNÇÕES DE CONTATOS (CSV E EXCEL) ---
    const normalizePhoneNumber = (phone) => {
        if (!phone) return null;
        let onlyNumbers = String(phone).replace(/\D/g, '');
        if (onlyNumbers.startsWith('55') && onlyNumbers.length >= 12) {
             return onlyNumbers;
        }
        if (onlyNumbers.length >= 10) { // Ex: 11987654321
            return `55${onlyNumbers}`;
        }
        return null;
    };
    
    const renderTable = () => {
        contactsTableBody.innerHTML = '';
        contacts.forEach((contact, index) => {
            const row = document.createElement('tr');
            row.dataset.index = index;
            row.innerHTML = `
                <td>${contact.nome}</td>
                <td>${contact.telefone}</td>
                <td><span class="status ${contact.status.replace(/\s+/g, '-').toLowerCase()}">${contact.status}</span></td>
            `;
            contactsTableBody.appendChild(row);
        });
        contactsTableContainer.classList.remove('hidden');
    };

    const processData = (data) => {
        contacts = data
            .map(item => ({
                nome: item.nome || item.Nome || '',
                telefone: normalizePhoneNumber(item.telefone || item.Telefone),
                status: 'Pronto para enviar'
            }))
            .filter(c => c.nome && c.telefone);
        
        addLog(`${contacts.length} contatos válidos carregados.`);
        contactsCount.textContent = contacts.length;
        renderTable();
        
        if (contacts.length > 0) {
            showStep(3);
        } else {
             addLog(`Nenhum contato válido encontrado no arquivo. Verifique as colunas 'nome' e 'telefone'.`, 'warning');
        }
    };

    const handleFileUpload = (file) => {
        if (!file) return;
        addLog(`Processando arquivo: ${file.name}`);
        fileName.textContent = file.name;
        fileSelected.classList.remove('hidden');
        
        const fileExtension = file.name.split('.').pop().toLowerCase();

        if (fileExtension === 'csv') {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.errors.length) {
                        addLog(`Erros no parsing do CSV: ${JSON.stringify(results.errors)}`, 'error');
                        return;
                    }
                    processData(results.data);
                },
                error: (error) => addLog(`Erro ao ler o CSV: ${error.message}`, 'error')
            });
        } else if (fileExtension === 'xls' || fileExtension === 'xlsx') {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    processData(jsonData);
                } catch (error) {
                    addLog(`Erro ao ler o arquivo Excel: ${error.message}`, 'error');
                }
            };
            reader.onerror = (error) => addLog(`Erro no FileReader: ${error.message}`, 'error');
            reader.readAsArrayBuffer(file);
        } else {
            addLog(`Formato de arquivo não suportado: ${fileExtension}`, 'error');
            alert('Por favor, selecione um arquivo .csv, .xls ou .xlsx');
        }
    };

    fileDropArea.addEventListener('click', () => fileInput.click());
    fileDropArea.addEventListener('dragover', (e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--whatsapp-green)'; });
    fileDropArea.addEventListener('dragleave', (e) => e.currentTarget.style.borderColor = 'var(--whatsapp-border)');
    fileDropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.currentTarget.style.borderColor = 'var(--whatsapp-border)';
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });
    fileInput.addEventListener('change', (e) => handleFileUpload(e.target.files[0]));
    
    // --- FUNÇÕES DE MENSAGEM E ENVIO ---
    previewBtn.addEventListener('click', () => {
        if (!messageText.value) return alert('Digite uma mensagem para visualizar.');
        if (contacts.length === 0) return alert('Carregue os contatos primeiro.');
        
        const sampleContact = contacts[0];
        const previewMessage = messageText.value.replace(/{{nome}}/g, sampleContact.nome);
        
        const confirmed = confirm(`Prévia para ${sampleContact.nome}:\n\n${previewMessage}\n\nDeseja avançar para a tela de envio?`);
        
        if(confirmed) {
            showStep(4);
            sendBtn.disabled = !isConnected;
        }
    });

    const updateStatusInTable = (index, newStatus) => {
        const row = contactsTableBody.querySelector(`tr[data-index='${index}']`);
        if(row) {
            const statusCell = row.querySelector('.status');
            statusCell.textContent = newStatus;
            statusCell.className = `status ${newStatus.replace(/\s+/g, '-').toLowerCase()}`;
        }
    };

    const updateProgress = (sent, total) => {
        const percent = total > 0 ? Math.round((sent / total) * 100) : 0;
        sendProgress.style.width = `${percent}%`;
        progressText.textContent = `${sent}/${total} enviados`;
        progressPercent.textContent = `${percent}%`;
    };

    const sendMessage = async (contact, index) => {
        updateStatusInTable(index, 'Enviando');
        const message = messageText.value.replace(/{{nome}}/g, contact.nome);
        const url = `${API_URL}/message/sendText/${INSTANCE_NAME}`;
        try {
            // Payload atualizado para corresponder à nova estrutura da API v2
            const payload = {
                number: contact.telefone,
                text: message
            };

            addLog(`Enviando para ${contact.nome}: ${JSON.stringify(payload)}`);

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'apikey': API_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `Request failed with status ${response.status}`;
                try {
                    const errorJson = JSON.parse(errorText);
                    if (errorJson.message) {
                        errorMessage = errorJson.message;
                    } else {
                         errorMessage += `: ${errorText}`;
                    }
                } catch (e) {
                     errorMessage += `: ${errorText}`;
                }
                throw new Error(errorMessage);
            }

            const responseBody = await response.json();

            if (responseBody.key && responseBody.key.id) {
                updateStatusInTable(index, 'Enviado');
                addLog(`Mensagem enviada com sucesso para ${contact.nome}.`);
                return true;
            } else {
                throw new Error(responseBody.message || 'A API não confirmou o envio.');
            }
        } catch (error) {
            updateStatusInTable(index, 'Erro ao enviar');
            addLog(`Falha ao enviar para ${contact.nome}: ${error.message}`, 'error');
            return false;
        }
    };

    sendBtn.addEventListener('click', async () => {
        if (!messageText.value || contacts.length === 0 || !isConnected) {
            alert('Verifique se a mensagem foi preenchida, os contatos carregados e a instância conectada.');
            return;
        }

        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        
        contacts.forEach((_, index) => updateStatusInTable(index, 'Em fila de envio'));
        addLog(`Iniciando envio para ${contacts.length} contatos...`);
        updateProgress(0, contacts.length);

        const delay = parseInt(delayTimeInput.value) * 1000;
        let sentCount = 0;
        let successCount = 0;

        for (let i = 0; i < contacts.length; i++) {
            const success = await sendMessage(contacts[i], i);
            if (success) successCount++;
            sentCount++;
            updateProgress(sentCount, contacts.length);
            
            if (i < contacts.length - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        addLog(`Envio concluído: ${successCount}/${contacts.length} mensagens enviadas com sucesso.`, successCount === contacts.length ? 'info' : 'warning');
        sendBtn.innerHTML = '<i class="fas fa-check"></i> Envio Concluído';
    });
    
    // --- INICIALIZAÇÃO ---
    showStep(1);
    checkConnectionState();
});


