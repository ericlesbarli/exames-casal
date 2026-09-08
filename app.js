// Estado da Aplicação
let examsData = {
  casal: { ele: "Éricles", ela: "Namorada", meta: "Check-up & Saúde 2026" },
  exames: []
};

let currentFilter = "todos";
let checkedItems = JSON.parse(localStorage.getItem("exames_checklist") || "{}");

// Inicialização
document.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  await loadExams();
  setupEventListeners();
  render();
  setInterval(updateCountdowns, 60000); // Atualiza contadores a cada minuto
});

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
  // Tenta carregar do localStorage primeiro, se existir customização
  const local = localStorage.getItem("exames_data");
  if (local) {
    try {
      examsData = JSON.parse(local);
      return;
    } catch (e) {
      console.error("Erro lendo localStorage, carregando exames.json", e);
    }
  }

  // Se não houver no local, carrega do arquivo data/exames.json
  try {
    const res = await fetch("data/exames.json");
    if (res.ok) {
      examsData = await res.json();
      saveToLocal();
    }
  } catch (err) {
    console.warn("Não foi possível carregar data/exames.json via fetch, usando fallback embutido.", err);
  }
}

function saveToLocal() {
  localStorage.setItem("exames_data", JSON.stringify(examsData));
}

// Configuração de Eventos
function setupEventListeners() {
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

  // Modal Novo Exame
  const modal = document.getElementById("modal-add");
  document.getElementById("btn-open-add")?.addEventListener("click", () => modal.classList.add("open"));
  document.getElementById("btn-close-modal")?.addEventListener("click", () => modal.classList.remove("open"));

  // Formulário de Adicionar Exame
  document.getElementById("form-add-exam")?.addEventListener("submit", (e) => {
    e.preventDefault();
    handleAddExam();
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
  if (total === 0) return;

  const concluidos = examsData.exames.filter(ex => ex.status === "concluido" || ex.status === "realizado").length;
  const percent = Math.round((concluidos / total) * 100);

  const bar = document.getElementById("progress-bar");
  const text = document.getElementById("progress-percent");
  const count = document.getElementById("progress-count");

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
    .filter(ex => ex.dateTime > now)
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
      // Jejum vai começar em breve
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
      // Já está no período de jejum!
      banner.innerHTML = `
        <div class="countdown-icon">⚠️</div>
        <div class="countdown-info">
          <h4>Jejum em Andamento!</h4>
          <p><strong>${nextExam.titulo}</strong> acontece às ${nextExam.horario}. Mantenham apenas hidratação com água!</p>
        </div>
      `;
    }
  } else {
    // Sem jejum obrigatório, apenas aviso do próximo exame
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

function handleAddExam() {
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

  const novoExame = {
    id: `ex-${Date.now().toString().slice(-4)}`,
    titulo,
    tipo,
    para,
    data,
    horario,
    local,
    endereco,
    mapsUrl: endereco ? `https://maps.google.com/?q=${encodeURIComponent(local + ' ' + endereco)}` : '',
    status: "agendado",
    jejumHoras,
    preparo: preparoRaw ? preparoRaw.split("\n").filter(Boolean) : [],
    documentos: ["Documento com foto", "Carteirinha do convênio", "Pedido médico"],
    cafePosExame: cafe
  };

  examsData.exames.push(novoExame);
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
