// Estado da Aplicação
let examsData = {
  casal: { ele: "Ericles", ela: "Rebeca", meta: "Check-up & Saúde 2026", senha: "casal2026" },
  exames: []
};

let currentFilter = "todos";
let checkedItems = JSON.parse(localStorage.getItem("exames_checklist") || "{}");

// Inicialização
document.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  await loadExams();
  initGoogleAuth();
  checkAuth();
  setupEventListeners();
  render();
  setInterval(updateCountdowns, 60000); // Atualiza contadores a cada minuto
});

// Sistema de Login e Autenticação
function checkAuth() {
  const authLocal = localStorage.getItem("exames_auth");
  const authSession = sessionStorage.getItem("exames_auth");
  const overlay = document.getElementById("login-overlay");
  const greeting = document.getElementById("user-greeting");
  const avatarImg = document.getElementById("user-avatar");
  const defaultLogo = document.getElementById("default-logo-badge");

  const authData = authLocal ? JSON.parse(authLocal) : authSession ? JSON.parse(authSession) : null;

  if (authData && authData.user) {
    if (overlay) overlay.style.display = "none";
    if (greeting) greeting.textContent = `Olá, ${authData.user}!`;
    
    if (authData.picture && avatarImg) {
      avatarImg.src = authData.picture;
      avatarImg.style.display = "block";
      if (defaultLogo) defaultLogo.style.display = "none";
    } else {
      if (avatarImg) avatarImg.style.display = "none";
      if (defaultLogo) defaultLogo.style.display = "flex";
    }
  } else {
    if (overlay) overlay.style.display = "flex";
  }
}

// Inicializa o Google Identity Services
// // Mapeamento e Validação de Usuários Autorizados
function getUserFromInput(input) {
  const clean = (input || "").toLowerCase().trim();
  if (clean === "rebecacoelho09@gmail.com" || clean === "rebeca") {
    return { name: "Rebeca", email: "rebecacoelho09@gmail.com" };
  }
  if (clean === "ericlesbarli@gmail.com" || clean === "ericles") {
    return { name: "Ericles", email: "ericlesbarli@gmail.com" };
  }
  return null;
}

// Senhas personalizáveis dos usuários
function getUserPassword(userName) {
  const saved = localStorage.getItem(`pass_${userName.toLowerCase()}`);
  return saved || "casal2026"; // Senha padrão inicial se não tiver alterado
}

function setUserPassword(userName, newPass) {
  localStorage.setItem(`pass_${userName.toLowerCase()}`, newPass);
}

// Token de recuperação temporário
let currentResetToken = null;

// Inicializa o Google Identity Services
function initGoogleAuth() {
  const clientId = (examsData.casal && examsData.casal.googleClientId) || "";
  const googleBtn = document.getElementById("btn-google-action");
  const forgotGoogleBtn = document.getElementById("btn-forgot-google");

  const triggerGoogleLogin = () => {
    if (clientId && window.google && window.google.accounts) {
      window.google.accounts.id.prompt();
    } else {
      // Login rápido direto pelo e-mail
      const emailInput = prompt("Digite o seu e-mail do Gmail cadastrado:", "");
      if (!emailInput) return;

      const userObj = getUserFromInput(emailInput);
      if (userObj) {
        const authData = {
          user: userObj.name,
          email: userObj.email,
          picture: `https://api.dicebear.com/7.x/initials/svg?seed=${userObj.name}&backgroundColor=0284c7`,
          type: "google",
          loggedAt: Date.now()
        };
        localStorage.setItem("exames_auth", JSON.stringify(authData));
        document.getElementById("login-overlay").style.display = "none";
        document.getElementById("modal-forgot")?.classList.remove("open");
        checkAuth();
        render();
      } else {
        alert("Acesso negado. Apenas Ericles e Rebeca podem entrar.");
      }
    }
  };

  googleBtn?.addEventListener("click", triggerGoogleLogin);
  forgotGoogleBtn?.addEventListener("click", triggerGoogleLogin);

  if (clientId) {
    const interval = setInterval(() => {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        clearInterval(interval);
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false
          });
        } catch (err) {
          console.error("Erro ao inicializar Google Identity Services:", err);
        }
      }
    }, 300);
  }
}

// Resposta do Google OAuth
function handleGoogleCredentialResponse(response) {
  try {
    const payload = parseJwt(response.credential);
    const email = (payload.email || "").toLowerCase().trim();
    const userObj = getUserFromInput(email);

    if (userObj) {
      const authData = {
        user: userObj.name,
        email: userObj.email,
        picture: payload.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${userObj.name}&backgroundColor=0284c7`,
        type: "google",
        loggedAt: Date.now()
      };
      localStorage.setItem("exames_auth", JSON.stringify(authData));
      document.getElementById("login-overlay").style.display = "none";
      checkAuth();
      render();
    } else {
      const errorBox = document.getElementById("login-error");
      if (errorBox) {
        errorBox.textContent = `Acesso negado para ${email}. Apenas Ericles e Rebeca podem entrar.`;
        errorBox.style.display = "block";
      }
    }
  } catch (err) {
    console.error("Erro ao processar login com Google:", err);
  }
}

// Decodifica JWT do Google
function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
  return JSON.parse(jsonPayload);
}

// Login Estilo GitHub (Formulário)
function handleGithubLogin(e) {
  e.preventDefault();
  const inputUser = document.getElementById("login-username").value;
  const inputPass = document.getElementById("login-password").value;
  const errorBox = document.getElementById("login-error");

  const userObj = getUserFromInput(inputUser);

  if (!userObj) {
    if (errorBox) {
      errorBox.textContent = "Incorrect username or email address.";
      errorBox.style.display = "block";
    }
    return;
  }

  const expectedPass = getUserPassword(userObj.name);

  if (inputPass === expectedPass) {
    const authData = {
      user: userObj.name,
      email: userObj.email,
      picture: `https://api.dicebear.com/7.x/initials/svg?seed=${userObj.name}&backgroundColor=0284c7`,
      type: "password",
      loggedAt: Date.now()
    };
    localStorage.setItem("exames_auth", JSON.stringify(authData));
    if (errorBox) errorBox.style.display = "none";
    document.getElementById("login-overlay").style.display = "none";
    checkAuth();
    render();
  } else {
    if (errorBox) {
      errorBox.innerHTML = `Incorrect password. <a href="#" onclick="openForgotModal(); return false;" style="color:#0969da; text-decoration:underline;">Esqueceu a senha?</a>`;
      errorBox.style.display = "block";
    }
  }
}

// Fluxo de Recuperação por Token
function openForgotModal() {
  const modal = document.getElementById("modal-forgot");
  if (!modal) return;
  document.getElementById("forgot-step-1").style.display = "block";
  document.getElementById("forgot-step-2").style.display = "none";
  document.getElementById("inp-forgot-email").value = "";
  modal.classList.add("open");
}

function handleRequestToken() {
  const email = document.getElementById("inp-forgot-email").value.trim().toLowerCase();
  const userObj = getUserFromInput(email);

  if (!userObj) {
    alert("Este e-mail não está cadastrado. Apenas Ericles ou Rebeca podem solicitar.");
    return;
  }

  // Gera token seguro aleatório de 6 dígitos
  const token = Math.floor(100000 + Math.random() * 900000).toString();
  currentResetToken = {
    token: token,
    userName: userObj.name,
    email: userObj.email
  };

  document.getElementById("display-token").textContent = token;
  document.getElementById("forgot-step-1").style.display = "none";
  document.getElementById("forgot-step-2").style.display = "block";
  document.getElementById("inp-verify-token").value = token; // Já auto-preenche para conveniência
}

function handleResetPassword(e) {
  e.preventDefault();
  const typedToken = document.getElementById("inp-verify-token").value.trim();
  const newPass = document.getElementById("inp-new-password").value.trim();

  if (!currentResetToken || typedToken !== currentResetToken.token) {
    alert("Token inválido! Verifique o código digitado.");
    return;
  }

  if (newPass.length < 3) {
    alert("A nova senha deve ter pelo menos 3 caracteres.");
    return;
  }

  // Salva a nova senha
  setUserPassword(currentResetToken.userName, newPass);

  // Faz login imediato
  const authData = {
    user: currentResetToken.userName,
    email: currentResetToken.email,
    picture: `https://api.dicebear.com/7.x/initials/svg?seed=${currentResetToken.userName}&backgroundColor=0284c7`,
    type: "token_reset",
    loggedAt: Date.now()
  };
  localStorage.setItem("exames_auth", JSON.stringify(authData));

  alert(`Senha alterada com sucesso! Bem-vindo(a), ${currentResetToken.userName}!`);
  document.getElementById("modal-forgot").classList.remove("open");
  document.getElementById("login-overlay").style.display = "none";
  checkAuth();
  render();
}

function handleLogout() {
  if (confirm("Deseja desconectar sua conta e bloquear o acesso?")) {
    localStorage.removeItem("exames_auth");
    sessionStorage.removeItem("exames_auth");
    const errorBox = document.getElementById("login-error");
    if (errorBox) errorBox.style.display = "none";
    
    // Reseta visual de avatar
    const avatarImg = document.getElementById("user-avatar");
    const defaultLogo = document.getElementById("default-logo-badge");
    if (avatarImg) avatarImg.style.display = "none";
    if (defaultLogo) defaultLogo.style.display = "flex";

    document.getElementById("login-overlay").style.display = "flex";
  }
}

// Gerenciamento de Tema (Claro / Escuro)
function initTheme() {
  const savedTheme = localStorage.getItem("exames_theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const next = current === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("exames_theme", next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const btn = document.getElementById("btn-theme");
  if (btn) btn.textContent = theme === "light" ? "🌙" : "☀️";
}

// Carregar Dados
async function loadExams() {
  try {
    const res = await fetch("data/exames.json?v=" + Date.now());
    if (res.ok) {
      const remoteData = await res.json();
      examsData.casal = remoteData.casal;
      
      const local = localStorage.getItem("exames_data");
      if (local) {
        try {
          const parsed = JSON.parse(local);
          // Se tiver exames locais válidos e não forem os de exemplo antigos (ex-001, etc)
          const hasOldMocks = parsed.exames && parsed.exames.some(e => e.id === "ex-001" || e.id === "ex-002");
          if (hasOldMocks) {
            examsData.exames = remoteData.exames || [];
          } else {
            examsData.exames = parsed.exames || remoteData.exames || [];
          }
        } catch (e) {
          examsData.exames = remoteData.exames || [];
        }
      } else {
        examsData.exames = remoteData.exames || [];
      }
      saveToLocal();
      return;
    }
  } catch (err) {
    console.warn("Não foi possível carregar data/exames.json via fetch, usando fallback.", err);
  }

  // Fallback se fetch falhar
  const local = localStorage.getItem("exames_data");
  if (local) {
    try {
      examsData = JSON.parse(local);
      examsData.casal = { ele: "Ericles", ela: "Rebeca", meta: "Check-up & Saúde 2026" };
    } catch (e) {}
  }
}

function saveToLocal() {
  localStorage.setItem("exames_data", JSON.stringify(examsData));
}

// Configuração de Eventos
function setupEventListeners() {
  // Login e Recuperação de Senha Estilo GitHub
  document.getElementById("form-github-login")?.addEventListener("submit", handleGithubLogin);
  document.getElementById("link-forgot-pass")?.addEventListener("click", (e) => {
    e.preventDefault();
    openForgotModal();
  });
  document.getElementById("btn-close-forgot")?.addEventListener("click", () => {
    document.getElementById("modal-forgot")?.classList.remove("open");
  });
  document.getElementById("btn-request-token")?.addEventListener("click", handleRequestToken);
  document.getElementById("form-reset-password")?.addEventListener("submit", handleResetPassword);

  // Logout
  document.getElementById("btn-logout")?.addEventListener("click", handleLogout);

  // Alternador de tema
  document.getElementById("btn-theme")?.addEventListener("click", toggleTheme);

  // Filtros
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      const target = e.currentTarget;
      target.classList.add("active");
      currentFilter = target.getAttribute("data-filter");
      renderExamList();
    });
  });

  // Modal Novo / Editar Exame
  const modal = document.getElementById("modal-add");
  document.getElementById("btn-open-add")?.addEventListener("click", () => {
    document.getElementById("form-add-exam").reset();
    document.getElementById("edit-exam-id").value = "";
    document.getElementById("modal-title").textContent = "Adicionar Novo Exame";
    modal.classList.add("open");
  });

  document.getElementById("btn-close-modal")?.addEventListener("click", () => modal.classList.remove("open"));

  // Formulário de Adicionar/Editar Exame
  document.getElementById("form-add-exam")?.addEventListener("submit", (e) => {
    e.preventDefault();
    handleAddOrEditExam();
  });

  // Exportar JSON para Git
  document.getElementById("btn-export")?.addEventListener("click", exportJsonData);
}

// Renderização Geral
function render() {
  renderProgress();
  renderFastingBanner();
  renderExamList();
}

// Barra de Progresso Compartilhada
function renderProgress() {
  const total = examsData.exames.length;
  const bar = document.getElementById("progress-bar");
  const text = document.getElementById("progress-percent");
  const count = document.getElementById("progress-count");

  if (total === 0) {
    if (bar) bar.style.width = "0%";
    if (text) text.textContent = "0%";
    if (count) count.textContent = "0 exames cadastrados";
    return;
  }

  const concluidos = examsData.exames.filter(ex => ex.status === "concluido" || ex.status === "realizado").length;
  const percent = Math.round((concluidos / total) * 100);

  if (bar) bar.style.width = `${percent}%`;
  if (text) text.textContent = `${percent}%`;
  if (count) count.textContent = `${concluidos} de ${total} exames realizados`;
}

// Banner de Jejum / Próximo Exame
function renderFastingBanner() {
  const banner = document.getElementById("countdown-banner");
  if (!banner) return;

  const now = new Date();
  const sortedUpcoming = [...examsData.exames]
    .filter(ex => ex.status !== "concluido")
    .map(ex => {
      const dt = new Date(`${ex.data}T${ex.horario}`);
      return { ...ex, dateTime: dt };
    })
    .filter(ex => !isNaN(ex.dateTime.getTime()) && ex.dateTime > now)
    .sort((a, b) => a.dateTime - b.dateTime);

  if (sortedUpcoming.length === 0) {
    banner.style.display = "none";
    return;
  }

  const nextExam = sortedUpcoming[0];
  const jejumHoras = nextExam.jejumHoras || 0;
  
  if (jejumHoras > 0) {
    const fastingStart = new Date(nextExam.dateTime.getTime() - (jejumHoras * 60 * 60 * 1000));
    const diffMs = fastingStart - now;

    banner.style.display = "flex";

    if (diffMs > 0) {
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      banner.innerHTML = `
        <div class="countdown-icon">⏳</div>
        <div class="countdown-info">
          <h4>Próximo Jejum: <strong>${nextExam.titulo}</strong> (${getParticipantName(nextExam.para)})</h4>
          <p>O jejum de ${jejumHoras}h deve iniciar em <span class="countdown-timer">${hours}h ${mins}m</span> (às ${formatTime(fastingStart)}).</p>
        </div>
      `;
    } else {
      banner.innerHTML = `
        <div class="countdown-icon">⚠️</div>
        <div class="countdown-info">
          <h4>Jejum em Andamento!</h4>
          <p><strong>${nextExam.titulo}</strong> acontece às ${nextExam.horario}. Mantenham apenas hidratação com água!</p>
        </div>
      `;
    }
  } else {
    banner.style.display = "flex";
    banner.innerHTML = `
      <div class="countdown-icon">📅</div>
      <div class="countdown-info">
        <h4>Próximo Compromisso: <strong>${nextExam.titulo}</strong></h4>
        <p>Data: <strong>${formatDateBr(nextExam.data)}</strong> às <strong>${nextExam.horario}</strong> no ${nextExam.local}.</p>
      </div>
    `;
  }
}

function updateCountdowns() {
  renderFastingBanner();
}

// Lista de Exames
function renderExamList() {
  const container = document.getElementById("exam-list");
  if (!container) return;

  if (examsData.exames.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🩺</div>
        <h3>Nenhum exame cadastrado ainda</h3>
        <p>A lista está limpinha! Clique no botão <strong>➕ Adicionar Exame</strong> abaixo para cadastrar o primeiro exame de vocês.</p>
      </div>
    `;
    return;
  }

  const filtered = examsData.exames.filter(ex => {
    if (currentFilter === "todos") return true;
    if (currentFilter === "ambos") return ex.para === "ambos";
    if (currentFilter === "ele") return ex.para === "ele" || ex.para === "ambos";
    if (currentFilter === "ela") return ex.para === "ela" || ex.para === "ambos";
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">Nenhum exame encontrado nesta categoria.</div>`;
    return;
  }

  // Ordenar por data
  filtered.sort((a, b) => new Date(`${a.data}T${a.horario}`) - new Date(`${b.data}T${b.horario}`));

  container.innerHTML = filtered.map(ex => createExamCardHtml(ex)).join("");

  // Event Listeners nos cartões
  container.querySelectorAll(".status-dropdown").forEach(select => {
    select.addEventListener("change", (e) => {
      const id = e.target.getAttribute("data-id");
      updateExamStatus(id, e.target.value);
    });
  });

  container.querySelectorAll(".chk-item").forEach(chk => {
    chk.addEventListener("change", (e) => {
      const key = e.target.getAttribute("data-key");
      checkedItems[key] = e.target.checked;
      localStorage.setItem("exames_checklist", JSON.stringify(checkedItems));
      e.target.closest(".checklist-item").classList.toggle("checked", e.target.checked);
    });
  });

  // Botões de Excluir
  container.querySelectorAll(".btn-delete-exam").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      deleteExam(id);
    });
  });

  // Botões de Editar
  container.querySelectorAll(".btn-edit-exam").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      openEditExamModal(id);
    });
  });
}

function createExamCardHtml(ex) {
  const isDone = ex.status === "concluido" || ex.status === "realizado";
  const badgeClass = ex.para === "ambos" ? "badge-ambos" : ex.para === "ela" ? "badge-ela" : "badge-ele";
  const badgeLabel = ex.para === "ambos" ? "👫 Juntos" : ex.para === "ela" ? `👩 ${examsData.casal.ela}` : `👨 ${examsData.casal.ele}`;

  const preparosHtml = (ex.preparo || []).map((item, idx) => {
    const key = `${ex.id}_p_${idx}`;
    const isChecked = !!checkedItems[key];
    return `
      <label class="checklist-item ${isChecked ? 'checked' : ''}">
        <input type="checkbox" class="chk-item" data-key="${key}" ${isChecked ? 'checked' : ''}>
        <span>${item}</span>
      </label>
    `;
  }).join("");

  const docsHtml = (ex.documentos || []).map((item, idx) => {
    const key = `${ex.id}_d_${idx}`;
    const isChecked = !!checkedItems[key];
    return `
      <label class="checklist-item ${isChecked ? 'checked' : ''}">
        <input type="checkbox" class="chk-item" data-key="${key}" ${isChecked ? 'checked' : ''}>
        <span>📄 ${item}</span>
      </label>
    `;
  }).join("");

  return `
    <div class="exam-card ${isDone ? 'done' : ''}" id="card-${ex.id}">
      <div class="exam-top">
        <div class="exam-title-group">
          <h3>${ex.titulo}</h3>
          <div class="exam-badge-row">
            <span class="badge ${badgeClass}">${badgeLabel}</span>
            <span class="badge badge-tipo">${ex.tipo || 'Exame'}</span>
            ${ex.jejumHoras > 0 ? `<span class="badge" style="background:#fef3c7; color:#b45309;">⚠️ Jejum ${ex.jejumHoras}h</span>` : ''}
          </div>
        </div>
        
        <div class="card-header-actions">
          <button class="btn-card-action btn-edit-exam" data-id="${ex.id}" title="Editar Exame">✏️</button>
          <button class="btn-card-action delete btn-delete-exam" data-id="${ex.id}" title="Apagar Exame">🗑️</button>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; margin-bottom: 10px;">
        <select class="status-dropdown" data-id="${ex.id}">
          <option value="agendado" ${ex.status === 'agendado' ? 'selected' : ''}>🗓️ Agendado</option>
          <option value="realizado" ${ex.status === 'realizado' ? 'selected' : ''}>💉 Realizado</option>
          <option value="aguardando" ${ex.status === 'aguardando' ? 'selected' : ''}>⏳ Aguardando Laudo</option>
          <option value="concluido" ${ex.status === 'concluido' ? 'selected' : ''}>✅ Concluído</option>
        </select>
      </div>

      <div class="exam-meta">
        <div class="meta-item">
          <span>📅</span> <strong>${formatDateBr(ex.data)} às ${ex.horario}</strong>
        </div>
        <div class="meta-item">
          <span>📍</span> <span>${ex.local}</span>
        </div>
        ${ex.endereco ? `
          <div class="meta-item" style="grid-column: 1 / -1;">
            <span>🗺️</span> 
            <span>${ex.endereco}</span> 
            ${ex.mapsUrl ? `(<a href="${ex.mapsUrl}" target="_blank" rel="noopener">Abrir Rota</a>)` : ''}
          </div>
        ` : ''}
      </div>

      ${(ex.preparo && ex.preparo.length > 0) || (ex.documentos && ex.documentos.length > 0) ? `
        <details class="details-box">
          <summary>
            <span>Instruções de Preparo e Documentos</span>
            <span>▾</span>
          </summary>
          <div class="details-content">
            ${preparosHtml}
            ${docsHtml}
          </div>
        </details>
      ` : ''}

      ${ex.cafePosExame ? `
        <div class="cafe-box">
          <span>☕</span>
          <span><strong>Parada do Casal:</strong> ${ex.cafePosExame}</span>
        </div>
      ` : ''}
    </div>
  `;
}

// Ações
function updateExamStatus(id, newStatus) {
  const item = examsData.exames.find(e => e.id === id);
  if (item) {
    item.status = newStatus;
    saveToLocal();
    renderProgress();
    renderExamList();
  }
}

function deleteExam(id) {
  const item = examsData.exames.find(e => e.id === id);
  const title = item ? item.titulo : "este exame";
  if (confirm(`Deseja realmente apagar "${title}"?`)) {
    examsData.exames = examsData.exames.filter(e => e.id !== id);
    saveToLocal();
    render();
  }
}

function openEditExamModal(id) {
  const ex = examsData.exames.find(e => e.id === id);
  if (!ex) return;

  document.getElementById("edit-exam-id").value = ex.id;
  document.getElementById("modal-title").textContent = "Editar Exame";
  document.getElementById("inp-titulo").value = ex.titulo;
  document.getElementById("inp-tipo").value = ex.tipo || "Laboratorial";
  document.getElementById("inp-para").value = ex.para || "ambos";
  document.getElementById("inp-data").value = ex.data || "";
  document.getElementById("inp-horario").value = ex.horario || "";
  document.getElementById("inp-local").value = ex.local || "";
  document.getElementById("inp-endereco").value = ex.endereco || "";
  document.getElementById("inp-jejum").value = ex.jejumHoras || 0;
  document.getElementById("inp-preparo").value = (ex.preparo || []).join("\n");
  document.getElementById("inp-cafe").value = ex.cafePosExame || "";

  document.getElementById("modal-add").classList.add("open");
}

function handleAddOrEditExam() {
  const editId = document.getElementById("edit-exam-id").value;
  const titulo = document.getElementById("inp-titulo").value.trim();
  const tipo = document.getElementById("inp-tipo").value;
  const para = document.getElementById("inp-para").value;
  const data = document.getElementById("inp-data").value;
  const horario = document.getElementById("inp-horario").value;
  const local = document.getElementById("inp-local").value.trim();
  const endereco = document.getElementById("inp-endereco").value.trim();
  const jejumHoras = parseInt(document.getElementById("inp-jejum").value) || 0;
  const preparoRaw = document.getElementById("inp-preparo").value.trim();
  const cafe = document.getElementById("inp-cafe").value.trim();

  const mapsUrl = endereco ? `https://maps.google.com/?q=${encodeURIComponent(local + ' ' + endereco)}` : '';
  const preparoList = preparoRaw ? preparoRaw.split("\n").filter(Boolean) : [];

  if (editId) {
    // Modo Edição
    const idx = examsData.exames.findIndex(e => e.id === editId);
    if (idx !== -1) {
      examsData.exames[idx] = {
        ...examsData.exames[idx],
        titulo,
        tipo,
        para,
        data,
        horario,
        local,
        endereco,
        mapsUrl,
        jejumHoras,
        preparo: preparoList,
        cafePosExame: cafe
      };
    }
  } else {
    // Novo Exame
    const novoExame = {
      id: `ex-${Date.now().toString().slice(-4)}`,
      titulo,
      tipo,
      para,
      data,
      horario,
      local,
      endereco,
      mapsUrl,
      status: "agendado",
      jejumHoras,
      preparo: preparoList,
      documentos: ["Documento com foto", "Carteirinha do convênio", "Pedido médico"],
      cafePosExame: cafe
    };
    examsData.exames.push(novoExame);
  }

  saveToLocal();
  document.getElementById("modal-add").classList.remove("open");
  document.getElementById("form-add-exam").reset();
  render();
}

function exportJsonData() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(examsData, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "exames.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  alert("Arquivo exames.json baixado! Você pode salvá-lo na pasta data/ para sincronizar com o GitHub.");
}

// Auxiliares
function getParticipantName(para) {
  if (para === "ambos") return "Casal";
  if (para === "ele") return examsData.casal.ele;
  return examsData.casal.ela;
}

function formatDateBr(isoDate) {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return isoDate;
}

function formatTime(dateObj) {
  return dateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
