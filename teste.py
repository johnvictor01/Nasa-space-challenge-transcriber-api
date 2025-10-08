import requests
import base64
import os

# --- Configuração ---
# Caminho do áudio local
AUDIO_PATH = "teste.mp3"
# URL da API hospedada no Railway
API_URL = "https://nasa-space-challenge-transcriber-api-production.up.railway.app/transcribe"

# Verifica se o arquivo de áudio existe
if not os.path.exists(AUDIO_PATH):
    print(f"❌ Erro: Arquivo de áudio não encontrado em '{AUDIO_PATH}'")
    exit()

# --- Preparação do Payload ---
try:
    # Converte o arquivo de áudio para Base64
    with open(AUDIO_PATH, "rb") as f:
        audio_bytes = f.read()
        audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
except Exception as e:
    print(f"❌ Erro ao ler ou codificar o arquivo de áudio: {e}")
    exit()

# Monta o payload JSON
payload = {"audioBase64": audio_base64}

print(f"🔍 Enviando áudio '{AUDIO_PATH}' para transcrição...")

# --- Requisição POST ---
try:
    # Faz a requisição POST com um timeout de 60 segundos
    response = requests.post(API_URL, json=payload, timeout=60)

    print("📡 Status HTTP:", response.status_code)

    # Tenta decodificar a resposta como JSON
    try:
        data = response.json()
        print("\n📝 Resposta JSON:")
        # Imprime de forma legível (pretty-print)
        import json
        print(json.dumps(data, indent=2, ensure_ascii=False))
    except requests.exceptions.JSONDecodeError:
        # Se não for JSON, mostra o texto bruto (geralmente uma página de erro HTML)
        print("\n⚠️ A resposta não é um JSON válido. Resposta bruta:")
        print(response.text)

except requests.exceptions.SSLError as e:
    print("\n❌ Erro de SSL: A conexão segura falhou.")
    print("   Isso geralmente significa que o servidor no Railway não está rodando ou está travando na inicialização.")
    print("   Verifique os logs do deploy no Railway para confirmar que não há erros como 'GROQ_KEY ausente'.")

except requests.exceptions.Timeout:
    print("\n❌ Erro de Timeout: A requisição demorou mais de 60 segundos para responder.")
    print("   O servidor pode estar sobrecarregado ou o processo de transcrição é muito longo.")

except requests.exceptions.RequestException as e:
    print(f"\n❌ Ocorreu um erro na requisição: {e}")
