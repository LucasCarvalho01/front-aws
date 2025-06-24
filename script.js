document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = window.APP_CONFIG.apiBaseUrl;
    const UPLOAD_URL_ENDPOINT = `${API_BASE_URL}/upload`;
    const EDIT_IMAGE_ENDPOINT = `${API_BASE_URL}/edit`;
    const DOWNLOAD_URL_ENDPOINT = `${API_BASE_URL}/images/`;

    AWS.config.region = window.APP_CONFIG.region;

    let currentUser = null;

    const loginScreen = document.getElementById('loginScreen');
    const mainApp = document.getElementById('mainApp');
    const loginButton = document.getElementById('loginButton');
    const authMessage = document.getElementById('authMessage');
    const userEmailSpan = document.getElementById('userEmail');
    const logoutButton = document.getElementById('logoutButton');

    const imageFileInput = document.getElementById('imageFile');
    const imageKeyUploadInput = document.getElementById('imageKeyUpload');
    const uploadButton = document.getElementById('uploadButton');

    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const removeImageButton = document.getElementById('removeImageButton');

    const imageKeyEditInput = document.getElementById('imageKeyEdit');
    const brightnessInput = document.getElementById('brightness');
    const contrastInput = document.getElementById('contrast');
    const sharpnessInput = document.getElementById('sharpness');
    const colorInput = document.getElementById('color');
    const editButton = document.getElementById('editButton');

    const imageKeyDownloadInput = document.getElementById('imageKeyDownl_oad');
    const thumbnailDonwloadInput = document.getElementById('isThumbnailSelect');
    const editedDonwloadInput = document.getElementById('isEditedSelect');
    const downloadButton = document.getElementById('downloadButton');

    const statusMessage = document.getElementById('statusMessage');

    function showAuthMessage(message, type = 'error') {
        authMessage.textContent = message;
        authMessage.className = type;
        authMessage.style.display = 'block';
    }

    function hideAuthMessage() {
        authMessage.style.display = 'none';
    }

    function showLogin() {
        loginScreen.style.display = 'flex';
        mainApp.style.display = 'none';
    }

    function showMainApp() {
        loginScreen.style.display = 'none';
        mainApp.style.display = 'block';
    }

    function showMessage(message, type = 'info') {
        statusMessage.textContent = message;
        statusMessage.className = type;
    }

    function showImagePreview(file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            imagePreview.src = e.target.result;
            imagePreviewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    function hideImagePreview() {
        imagePreviewContainer.style.display = 'none';
        imagePreview.src = '';
        imageFileInput.value = '';
    }

    function openTab(tabId) {
        const tabContents = document.querySelectorAll('.tab-content');
        const tabButtons = document.querySelectorAll('.tab-button');

        tabContents.forEach(content => content.classList.remove('active'));
        tabButtons.forEach(button => button.classList.remove('active'));

        document.getElementById(tabId).classList.add('active');
        document.querySelector(`button[onclick="openTab('${tabId}')"]`).classList.add('active');
    }

    window.openTab = openTab;

    const cognitoAuthConfig = {
        authority: window.APP_CONFIG.authority,
        client_id: window.APP_CONFIG.clientId,
        redirect_uri: window.location.origin,
        post_logout_redirect_uri: window.location.origin,
        response_type: "code",
        scope: "email openid profile",
        loadUserInfo: false
    };

    const userManager = new oidc.UserManager(cognitoAuthConfig);

    async function login() {
        try {
            await userManager.signinRedirect();
        } catch (error) {
            console.error('Erro no login:', error);
            showAuthMessage('Erro ao iniciar login', 'error');
        }
    }

    async function logout() {
        try {
            const clientId = window.APP_CONFIG.clientId;
            const logoutUri = window.location.origin;
            const cognitoDomain = window.APP_CONFIG.domain;
            
            await userManager.removeUser();
            currentUser = null;
            
            window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
        } catch (error) {
            console.error('Erro no logout:', error);
            showAuthMessage('Erro ao fazer logout', 'error');
        }
    }

    async function handleCallback() {
        try {
            if (window.location.search.includes('code=') || window.location.search.includes('error=')) {
                showAuthMessage('Completando login...', 'info');
                
                const user = await userManager.signinCallback();
                currentUser = user;
                
                window.history.replaceState({}, document.title, window.location.pathname);
                
                userEmailSpan.textContent = user.profile.email || 'Usuário';
                hideAuthMessage();
                showMainApp();
                
                return true;
            }
            return false;
        } catch (error) {
            console.error('Erro no callback:', error);
            showAuthMessage('Erro ao completar login', 'error');
            showLogin();
            return false;
        }
    }

    async function checkSession() {
        try {
            const wasCallback = await handleCallback();
            if (wasCallback) return;

            currentUser = await userManager.getUser();
            
            if (currentUser && !currentUser.expired) {
                userEmailSpan.textContent = currentUser.profile.email || 'Usuário';
                showMainApp();
            } else {
                showLogin();
                if (currentUser && currentUser.expired) {
                    console.log('Sessão expirada');
                }
            }
        } catch (error) {
            console.error('Erro ao verificar sessão:', error);
            showLogin();
        }
    }

    async function makeAuthenticatedRequest(url, options = {}) {
        try {
            const user = await userManager.getUser();
            if (!user || user.expired) {
                throw new Error('Usuário não autenticado ou sessão expirada');
            }

            const headers = {
                'Authorization': `Bearer ${user.access_token}`,
                'Content-Type': 'application/json',
                ...options.headers
            };

            return fetch(url, {
                ...options,
                headers
            });
        } catch (error) {
            console.error('Erro autenticacao:', error);
            showMessage('Erro de autenticação. Faça login novamente.', 'error');
            await logout();
            throw error;
        }
    }

    loginButton.addEventListener('click', login);
    logoutButton.addEventListener('click', logout);

    imageFileInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            showImagePreview(file);
        } else if (file) {
            showMessage('Por favor, selecione apenas arquivos de imagem.', 'error');
            hideImagePreview();
        } else {
            hideImagePreview();
        }
    });

    removeImageButton.addEventListener('click', hideImagePreview);

    uploadButton.addEventListener('click', async () => {
        const file = imageFileInput.files[0];
        const imageKey = imageKeyUploadInput.value.trim();

        if (!file || !imageKey) {
            showMessage('selecione um arquivo e forneça um nome para a imagem.', 'error');
            return;
        }

        try {
            showMessage('Obtendo URL de upload...', 'info');

            const response = await makeAuthenticatedRequest(UPLOAD_URL_ENDPOINT, {
                method: 'POST',
                body: JSON.stringify({
                    key: imageKey
                })
            });

            if (!response.ok) {
                throw new Error(`Erro ao obter URL de upload: ${response.status}`);
            }

            const { upload_url } = await response.json();

            showMessage('Fazendo upload da imagem...', 'info');

            const uploadResponse = await fetch(upload_url, {
                method: 'PUT',
                body: file
            });

            if (!uploadResponse.ok) {
                throw new Error(`Falha no upload: ${uploadResponse.status}`);
            }

            showMessage(`Imagem "${imageKey}" enviada com sucesso`, 'success');
            imageKeyUploadInput.value = '';
            hideImagePreview();

        } catch (error) {
            console.error('Erro no upload:', error);
            showMessage(`Erro no upload: ${error.message}`, 'error');
        }
    });

    editButton.addEventListener('click', async () => {
        const imageKey = imageKeyEditInput.value.trim();

        if (!imageKey) {
            showMessage('Por favor, forneça o nome da imagem para editar.', 'error');
            return;
        }

        const editProperties = {
            brightness: parseInt(brightnessInput.value),
            contrast: parseInt(contrastInput.value),
            sharpness: parseInt(sharpnessInput.value),
            color: parseInt(colorInput.value)
        };

        try {
            showMessage('Editando imagem...', 'info');

            const response = await makeAuthenticatedRequest(EDIT_IMAGE_ENDPOINT, {
                method: 'POST',
                body: JSON.stringify({
                    key: imageKey,
                    edit_properties: editProperties
                })
            });

            if (!response.ok) {
                throw new Error(`Erro na edição: ${response.status}`);
            }

            showMessage(`Edição da imagem "${imageKey}" enviada com sucesso!`, 'success');

        } catch (error) {
            console.error('Erro na edição:', error);
            showMessage(`Erro na edição: ${error.message}`, 'error');
        }
    });

    downloadButton.addEventListener('click', async () => {
        const imageKey = imageKeyDownloadInput.value.trim();
        const isThumbnail = thumbnailDonwloadInput.checked;
        const isEdited = editedDonwloadInput.checked;

        let downloadUrl = `${DOWNLOAD_URL_ENDPOINT}/${imageKey}`;
        if (isThumbnail) {
            downloadUrl = `${DOWNLOAD_URL_ENDPOINT}/resized-${imageKey}`;
        }
        if (isEdited) {
            downloadUrl = `${DOWNLOAD_URL_ENDPOINT}/edited-${imageKey}`;
        }

        if (!imageKey) {
            showMessage('Por favor, forneça o nome da imagem para download.', 'error');
            return;
        }

        try {
            showMessage('Obtendo URL de download...', 'info');

            const response = await makeAuthenticatedRequest(downloadUrl);

            if (!response.ok) {
                throw new Error(`Erro ao obter URL de download: ${response.status}`);
            }

            const { download_url } = await response.json();

            showMessage('Redirecionando para download...', 'success');
            window.open(download_url, '_blank');

            showMessage('Download concluído!', 'success');
        } catch (error) {
            console.error('Erro no download:', error);
            showMessage(`Erro no download: ${error.message}`, 'error');
        }
    });

    userManager.events.addUserLoaded((user) => {
        currentUser = user;
    });

    userManager.events.addUserUnloaded(() => {
        currentUser = null;
        showLogin();
    });

    userManager.events.addAccessTokenExpired(() => {
        showMessage('Sessão expirada. Faça login novamente.', 'error');
        logout();
    });

    userManager.events.addSilentRenewError((error) => {
        console.error('Erro na renovação silenciosa:', error);
    });

    openTab('uploadTab');
    checkSession();
});