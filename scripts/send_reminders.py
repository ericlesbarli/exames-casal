#!/usr/bin/env python3
"""
Script de Lembretes de Exames do Casal por E-mail.
Pode ser executado localmente com --dry-run ou via GitHub Actions.
"""

import os
import sys
import json
import argparse
from datetime import datetime, date, timedelta
import urllib.request
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

# Garante suporte a UTF-8 no terminal Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def load_exams_data(filepath="data/exames.json"):
    if not os.path.exists(filepath):
        print(f"Erro: Arquivo {filepath} não encontrado.")
        sys.exit(1)
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)

def find_upcoming_exams(data, days_ahead=2):
    today = date.today()
    upcoming = []
    
    for ex in data.get("exames", []):
        if ex.get("status") in ["concluido", "realizado"]:
            continue
        try:
            exam_date = datetime.strptime(ex["data"], "%Y-%m-%d").date()
            diff_days = (exam_date - today).days
            if 0 <= diff_days <= days_ahead:
                upcoming.append((diff_days, ex))
        except Exception as e:
            print(f"Aviso: Não foi possível processar a data do exame {ex.get('titulo')}: {e}")
            
    upcoming.sort(key=lambda x: x[0])
    return upcoming

def build_email_html(upcoming, casal_info):
    today_str = datetime.now().strftime("%d/%m/%Y")
    
    cards_html = ""
    for diff_days, ex in upcoming:
        when_text = "🚨 HOJE!" if diff_days == 0 else "⏰ AMANHÃ!" if diff_days == 1 else f"📅 Em {diff_days} dias"
        para_text = "👫 Ambos (Juntos)" if ex.get("para") == "ambos" else f"👤 {ex.get('para', '').capitalize()}"
        
        preparos = "".join([f"<li>{p}</li>" for p in ex.get("preparo", [])])
        docs = "".join([f"<li>{d}</li>" for d in ex.get("documentos", [])])
        
        jejum_box = ""
        if ex.get("jejumHoras", 0) > 0:
            jejum_box = f"""
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 10px 14px; margin: 12px 0; border-radius: 4px;">
                <strong style="color: #92400e;">⚠️ Atenção ao Jejum:</strong>
                <span style="color: #78350f;">Obrigatório jejum de <strong>{ex.get('jejumHoras')} horas</strong> antes do horário marcado ({ex.get('horario')}).</span>
            </div>
            """
            
        cafe_box = ""
        if ex.get("cafePosExame"):
            cafe_box = f"""
            <div style="background-color: #ecfdf5; border: 1px dashed #10b981; padding: 8px 12px; margin-top: 10px; border-radius: 6px; color: #065f46; font-size: 14px;">
                ☕ <strong>Parada Pós-Exame:</strong> {ex.get('cafePosExame')}
            </div>
            """

        cards_html += f"""
        <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
                <span style="background-color: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                    {when_text}
                </span>
                <span style="color: #64748b; font-size: 13px; font-weight: bold;">{para_text}</span>
            </div>
            <h2 style="color: #0f172a; margin: 6px 0 12px 0; font-size: 18px;">{ex.get('titulo')}</h2>
            
            <p style="margin: 4px 0; color: #334155; font-size: 14px;">
                <strong>🕒 Horário:</strong> {ex.get('horario')} | <strong>Data:</strong> {datetime.strptime(ex['data'], '%Y-%m-%d').strftime('%d/%m/%Y')}
            </p>
            <p style="margin: 4px 0; color: #334155; font-size: 14px;">
                <strong>📍 Local:</strong> {ex.get('local')}
            </p>
            {f"<p style='margin: 4px 0; color: #64748b; font-size: 13px;'>🗺️ {ex.get('endereco')}</p>" if ex.get('endereco') else ""}

            {jejum_box}

            {f"<div style='margin-top: 12px;'><strong style='color: #334155; font-size: 13px;'>📋 Instruções de Preparo:</strong><ul style='color: #475569; font-size: 13px; margin: 6px 0 0 18px; padding: 0;'>{preparos}</ul></div>" if preparos else ""}
            {f"<div style='margin-top: 10px;'><strong style='color: #334155; font-size: 13px;'>📄 Documentos Obrigatórios:</strong><ul style='color: #475569; font-size: 13px; margin: 6px 0 0 18px; padding: 0;'>{docs}</ul></div>" if docs else ""}
            {cafe_box}
        </div>
        """

    html = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a;">
        <div style="max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="font-size: 40px; margin-bottom: 8px;">❤️‍🩹</div>
                <h1 style="color: #0284c7; margin: 0; font-size: 22px;">Lembrete de Exames do Casal</h1>
                <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">{casal_info.get('meta', 'Check-up & Saúde')}</p>
            </div>

            {cards_html}

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px;">
                <p>Enviado automaticamente pelo robô de exames do casal ❤️</p>
                <p>Juntos em cada passo pela nossa saúde!</p>
            </div>
        </div>
    </body>
    </html>
    """
    return html

def send_via_resend(api_key, to_emails, subject, html_content):
    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "from": "Missão Saúde <onboarding@resend.dev>",
        "to": [e.strip() for e in to_emails.split(",") if e.strip()],
        "subject": subject,
        "html": html_content
    }
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            print(f"Sucesso! E-mail enviado via Resend: Código {resp.status}")
    except urllib.error.HTTPError as e:
        print(f"Erro ao enviar via Resend: {e.code} - {e.read().decode('utf-8')}")
        sys.exit(1)

def send_via_smtp(user, password, host, port, to_emails, subject, html_content):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = user
    msg["To"] = to_emails
    msg.attach(MIMEText(html_content, "html"))

    try:
        with smtplib.SMTP_SSL(host, port) as server:
            server.login(user, password)
            recipients = [e.strip() for e in to_emails.split(",") if e.strip()]
            server.sendmail(user, recipients, msg.as_string())
        print(f"Sucesso! E-mail enviado via SMTP para {to_emails}")
    except Exception as e:
        print(f"Erro ao enviar via SMTP: {e}")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Envio de lembretes de exames do casal.")
    parser.add_argument("--dry-run", action="store_true", help="Apenas simula e imprime no console/gera arquivo HTML.")
    parser.add_argument("--data", default="data/exames.json", help="Caminho para o exames.json")
    args = parser.parse_args()

    data = load_exams_data(args.data)
    casal_info = data.get("casal", {})
    upcoming = find_upcoming_exams(data, days_ahead=2)

    if not upcoming:
        print("Nenhum exame agendado para os próximos 2 dias. Nenhuma notificação necessária.")
        return

    print(f"Encontrados {len(upcoming)} exame(s) nos próximos 2 dias.")
    html_content = build_email_html(upcoming, casal_info)
    subject = f"🩺 Lembrete de Exames do Casal: {upcoming[0][1].get('titulo')}"

    if args.dry_run:
        preview_path = "preview_email.html"
        with open(preview_path, "w", encoding="utf-8") as f:
            f.write(html_content)
        print(f"[DRY RUN] Simulação concluída com sucesso!")
        print(f"Assunto: {subject}")
        print(f"Arquivo de prévia visual do e-mail gerado em: {os.path.abspath(preview_path)}")
        return

    # Envio real
    to_emails = os.getenv("RECIPIENT_EMAILS")
    if not to_emails:
        print("Erro: Variável de ambiente RECIPIENT_EMAILS não configurada.")
        sys.exit(1)

    resend_key = os.getenv("RESEND_API_KEY")
    if resend_key:
        send_via_resend(resend_key, to_emails, subject, html_content)
        return

    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 465))

    if smtp_user and smtp_pass:
        send_via_smtp(smtp_user, smtp_pass, smtp_host, smtp_port, to_emails, subject, html_content)
        return

    print("Erro: Nenhuma credencial de e-mail encontrada (defina RESEND_API_KEY ou SMTP_USER/SMTP_PASSWORD).")
    sys.exit(1)

if __name__ == "__main__":
    main()
