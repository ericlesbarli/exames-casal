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
// Mapeamento e Validação de Usuários Autorizados
function getUserFromEmail(email) {
  const cleanEmail = (email || "").toLowerCase().trim();
  if (cleanEmail === "rebecacoelho09@gmail.com") return "Rebeca";
  if (cleanEmail === "ericlesbarli@gmail.com") return "Ericles";
  
  // Verifica também lista dinâmica se houver
  const dynamicMap = (examsData.casal && examsData.casal.usuarios) || {};
  if (dynamicMap[cleanEmail]) return dynamicMap[cleanEmail];
  
  return null;
}

// Inicializa o Google Identity Services
function initGoogleAuth() {
  const clientId = (examsData.casal && examsData.casal.googleClientId) || "";
  const container = document.getElementById("g_id_signin");
  if (!container) return;

  if (!clientId) {
    // Botão amigável com autenticação direta para os e-mails autorizados
    container.innerHTML = `
      <button type="button" id="btn-google-setup" style="display: inline-flex; align-items: center; gap: 10px; background: #ffffff; border: 1px solid var(--border); color: #374151; font-weight: 600; padding: 12px 20px; border-radius: 9999px; cursor: pointer; font-size: 0.95rem; box-shadow: 0 2px 5px rgba(0,0,0,0.08); width: 100%; justify-content: center; transition: all 0.2s;">
        <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
        <span>Entrar com Conta Google (Gmail)</span>
      </button>
    `;

    document.getElementById("btn-google-setup")?.addEventListener("click", () => {
      const emailInput = prompt("Digite ou confirme o seu e-mail do Gmail cadastrado:", "");
      if (!emailInput) return;

      const email = emailInput.trim().toLowerCase();
      const userName = getUserFromEmail(email);

      if (userName) {
        const authData = {
          user: userName,
          email: email,
          picture: `https://api.dicebear.com/7.x/initials/svg?seed=${userName}&backgroundColor=0284c7`,
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
          errorBox.textContent = `Acesso negado para "${email}". Apenas ericlesbarli@gmail.com e rebecacoelho09@gmail.com podem entrar.`;
          errorBox.style.display = "block";
        }
      }
    });
    return;
  }

  // Se tiver Client ID configurado, inicializa o widget oficial do Google
  const interval = setInterval(() => {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      clearInterval(interval);
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false
        });
        window.google.accounts.id.renderButton(container, {
          theme: "outline",
          size: "large",
          type: "standard",
          text: "continue_with",
          shape: "pill",
          logo_alignment: "left",
          width: 280
        });
      } catch (err) {
        console.error("Erro ao inicializar Google Identity Services:", err);
      }
    }
  }, 300);
}

// Resposta do Google OAuth
function handleGoogleCredentialResponse(response) {
  try {
    const payload = parseJwt(response.credential);
    const email = (payload.email || "").toLowerCase().trim();
    const userName = getUserFromEmail(email);

    if (userName) {
      const authData = {
        user: userName,
        email: email,
        picture: payload.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${userName}&backgroundColor=0284c7`,
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
