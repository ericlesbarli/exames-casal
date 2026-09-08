# 🩺 Missão Check-up & Saúde do Casal

Aplicação web interativa, responsiva e moderna feita para casais acompanharem sua rotina de exames médicos juntos, com contagem regressiva de jejum, rotas para laboratórios, checklist de documentos e automação de alertas por e-mail via **GitHub Actions**.

---

## ✨ Funcionalidades

- **Visão do Casal e Filtros:** Visualize exames de ambos (`Juntos`), ou filtre apenas por um de vocês.
- **Barra de Progresso:** Acompanhe visualmente a porcentagem de exames concluídos do check-up.
- **Contagem Regressiva de Jejum:** O sistema calcula automaticamente quando o jejum deve começar com base no horário do exame.
- **Logística Facilitada:** Botão direto para rota no Google Maps/Waze para cada laboratório.
- **Parada do Casal (Café Pós-Exame ☕):** Espaço para planejar aquele café da manhã ou lanche merecido pós-furadas.
- **PWA (Instalável no celular):** Funciona como app nativo na tela inicial do Android e iPhone.
- **Tema Claro / Escuro:** Alternância de modo escuro com um toque.
- **Alertas Automáticos por E-mail:** Workflow no GitHub Actions que avisa na véspera (para não esquecer o jejum) e na manhã do exame.

---

## 🚀 Como Ativar o Dashboard no GitHub Pages

1. Suba este projeto para o seu repositório no GitHub (`@ericlesbarli`).
2. No seu repositório no GitHub, acesse a aba **Settings** (Configurações).
3. No menu lateral esquerdo, clique em **Pages**.
4. Em **Build and deployment > Source**, selecione:
   - **Branch:** `main` (ou `master`)
   - **Folder:** `/ (root)`
5. Clique em **Save**.
6. Em cerca de 1 minuto, o GitHub gerará o link da página (ex: `https://ericlesbarli.github.io/nome-do-repo/`).
7. Compartilhe o link com a sua namorada! Ambos podem clicar em **"Adicionar à Tela de Início"** no navegador do celular para usar como aplicativo.

---

## 📬 Como Configurar os E-mails Automáticos

O repositório inclui um workflow que roda 2x ao dia (às 07h e às 20h) para verificar se há exames no dia ou no dia seguinte.

Para ativar os envios:
1. No seu repositório, vá em **Settings > Secrets and variables > Actions**.
2. Clique em **New repository secret** e adicione:
   - `RECIPIENT_EMAILS`: Os e-mails de vocês dois separados por vírgula (ex: `ericles@email.com, namorada@email.com`).
   - `RESEND_API_KEY`: Sua chave gratuita do [Resend](https://resend.com) (leva 2 minutos para criar e tem limite gratuito de 3.000 e-mails/mês).
3. *(Opcional)* Se preferir usar Gmail SMTP em vez do Resend, configure: `SMTP_USER`, `SMTP_PASSWORD` (senha de app), `SMTP_HOST` e `SMTP_PORT`.

---

## 💻 Testando Localmente no Computador

Você pode abrir o projeto localmente com qualquer navegador ou servidor simples:

```bash
# Iniciar servidor local
python -m http.server 8000

# Abrir no navegador
# Acesse: http://localhost:8000
```

Para testar o gerador de e-mail sem enviar nada:
```bash
python scripts/send_reminders.py --dry-run
# Um arquivo preview_email.html será gerado para você conferir a aparência!
```

---

## 📝 Como Atualizar os Exames

Você tem duas formas práticas:
1. **Pela interface web:** Clique no botão `➕ Adicionar Exame`, preencha os dados e use o botão de disquete `💾` no canto superior para baixar o `exames.json` atualizado.
2. **Direto no arquivo:** Edite o arquivo `data/exames.json` diretamente pelo VS Code ou pela interface do GitHub.
