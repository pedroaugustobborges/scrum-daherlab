"""
test-humandAPI.py

Testa a API da Humand em duas etapas:
  1. Testa o envio de mensagem (chat.postMessage) — valida token e endpoint
  2. Busca conversas DM, cruza com perfis Supabase e exporta CSV

Uso:
    pip install requests supabase
    python test-humandAPI.py

Saída:
    humand_channels_export.csv   — canais DM encontrados no Humand x perfis Supabase
    humand_unmatched_profiles.csv — perfis Supabase sem canal Humand correspondente
"""

import csv
import json
import uuid
import requests
from supabase import create_client, Client

# ---------------------------------------------------------------------------
# Configuração
# ---------------------------------------------------------------------------

HUMAND_BASE_URL = "https://api-prod.humand.co/public/api/v1"
HUMAND_AUTH = "Basic NTc1MDQwNTpTc2lRZlNrWlhaNmd4aEdwYWNBS3JJMUJac2M4eEZyMA=="

SUPABASE_URL = "https://vzlgssqtzerleeskhzmo.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6bGdzc3F0emVybGVlc2toem1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDEwNDIyMywiZXhwIjoyMDc5NjgwMjIzfQ.bGpEOAup4ayfj1pZO-uwNCG3DAAvxJXV6l_OfNtwvKE"

CSV_CHANNELS  = "humand_channels_export.csv"
CSV_UNMATCHED = "humand_unmatched_profiles.csv"

# ---------------------------------------------------------------------------
# ETAPA 1 — Testar envio de mensagem (chat.postMessage)
# ---------------------------------------------------------------------------

def test_send_message(channel_id: str, text: str = "Teste da integração Ada ✅") -> bool:
    """
    Envia uma mensagem de teste para um canal Humand.
    Retorna True se foi enviada com sucesso.

    O Idempotency-Key é obrigatório pela API — gerado como UUID4 por request.
    """
    url = f"{HUMAND_BASE_URL}/marty/chat.postMessage"
    idempotency_key = str(uuid.uuid4())

    headers = {
        "Authorization": HUMAND_AUTH,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotency_key,
    }
    body = {
        "channel": channel_id,
        "text": text,
        "mrkdwn": False,
    }

    print("=" * 60)
    print("ETAPA 1 — Testando chat.postMessage")
    print(f"   URL:              {url}")
    print(f"   Channel:          {channel_id}")
    print(f"   Idempotency-Key:  {idempotency_key}")
    print(f"   Body:             {json.dumps(body)}")

    response = requests.post(url, headers=headers, json=body, timeout=30)

    print(f"   Status HTTP:      {response.status_code}")
    print(f"   Body response:    {response.text[:500]}")

    if response.ok:
        data = response.json()
        if data.get("ok"):
            print("\n   ✅ SUCESSO! Mensagem enviada.")
            print(f"   ts (message id): {data.get('ts')}")
            return True
        else:
            print(f"\n   ⚠️  API retornou ok=false: {data}")
            return False
    else:
        print(f"\n   ❌ ERRO {response.status_code}")
        if response.status_code == 401:
            print("   → Token inválido ou expirado.")
        elif response.status_code == 400:
            print("   → Bad Request: channel_id inválido ou body incorreto.")
        elif response.status_code == 403:
            print("   → Sem permissão para postar nesse canal.")
        elif response.status_code == 409:
            print("   → Conflict: Idempotency-Key já usado. Rode novamente.")
        return False

# ---------------------------------------------------------------------------
# ETAPA 2 — Buscar conversas DM
# ---------------------------------------------------------------------------

def fetch_conversations() -> list[dict]:
    url = f"{HUMAND_BASE_URL}/marty/conversations.list"
    headers = {"Authorization": HUMAND_AUTH}

    print("\n" + "=" * 60)
    print("ETAPA 2 — Buscando conversas DM (conversations.list)")
    print(f"   URL: {url}")

    response = requests.get(url, headers=headers, timeout=30)

    print(f"   Status HTTP: {response.status_code}")
    print(f"   Body:        {response.text[:500]}")

    if not response.ok:
        if response.status_code == 401:
            print("   → Token inválido. Verifique HUMAND_AUTH.")
        elif response.status_code == 403:
            print("   → Sem permissão para listar conversas.")
        elif response.status_code == 404:
            print("   → Endpoint não encontrado.")
        return []

    data = response.json()
    print(f"   Chaves do response: {list(data.keys())}")

    conversations = data.get("conversations", [])
    print(f"   Total de conversas: {len(conversations)}")

    if not conversations:
        print("\n   Response completo (para depuração):")
        print(json.dumps(data, indent=2, ensure_ascii=False)[:3000])
        return []

    print(f"   Chaves da conversa[0]: {list(conversations[0].keys())}")
    if "hu_data" in conversations[0]:
        print(f"   Chaves de hu_data:     {list(conversations[0]['hu_data'].keys())}")

    return conversations

# ---------------------------------------------------------------------------
# Extrair mapeamento DM (channel_id, email, nome)
# ---------------------------------------------------------------------------

def extract_dm_mapping(conversations: list[dict]) -> list[dict]:
    mapping = []
    print("\n   Filtrando tipo 'im' (direct message)...")

    for conv in conversations:
        if conv.get("type") != "im":
            continue

        channel_id = conv.get("id", "")

        # Estratégia 1: hu_data.other_user (deprecated mas ainda pode funcionar)
        other_user = conv.get("hu_data", {}).get("other_user", {})
        email = other_user.get("email") or other_user.get("profile", {}).get("email")
        humand_name = other_user.get("name", "") or other_user.get("real_name", "")
        humand_user_id = other_user.get("id", "")

        # Estratégia 2: campo "user" direto
        if not email:
            user_obj = conv.get("user", {})
            if isinstance(user_obj, dict):
                email = user_obj.get("email", "")
                humand_name = humand_name or user_obj.get("name", "")
                humand_user_id = humand_user_id or user_obj.get("id", "")

        # Estratégia 3: campo "members"
        if not email:
            members = conv.get("members", [])
            if members and isinstance(members[0], dict):
                email = members[0].get("email", "")
                humand_name = humand_name or members[0].get("name", "")

        if not channel_id:
            continue

        if not email:
            print(f"   PULAR  {channel_id} — sem e-mail para '{humand_name or 'Desconhecido'}'")
            mapping.append({
                "channel_id": channel_id,
                "humand_user_id": humand_user_id,
                "humand_name": humand_name,
                "email": "",
                "status": "SEM_EMAIL",
            })
            continue

        mapping.append({
            "channel_id": channel_id,
            "humand_user_id": humand_user_id,
            "humand_name": humand_name,
            "email": email.lower().strip(),
            "status": "PENDENTE",
        })

    print(f"   Canais DM encontrados: {len(mapping)}")
    return mapping

# ---------------------------------------------------------------------------
# Buscar perfis do Supabase
# ---------------------------------------------------------------------------

def fetch_supabase_profiles(supabase: Client) -> dict[str, dict]:
    print("\n   Buscando perfis no Supabase...")
    result = (
        supabase.table("profiles")
        .select("id, full_name, email, role, humand_channel_id")
        .execute()
    )
    profiles_by_email = {}
    for profile in (result.data or []):
        email = (profile.get("email") or "").lower().strip()
        if email:
            profiles_by_email[email] = profile
    print(f"   Perfis encontrados: {len(profiles_by_email)}")
    return profiles_by_email

# ---------------------------------------------------------------------------
# Cruzar dados
# ---------------------------------------------------------------------------

def cross_reference(mapping: list[dict], profiles_by_email: dict) -> tuple[list[dict], list[dict]]:
    print("\n   Cruzando Humand ↔ Supabase...")
    matched_emails = set()

    for item in mapping:
        email = item["email"]
        profile = profiles_by_email.get(email)
        if profile:
            item["profile_id"]          = profile.get("id", "")
            item["profile_name"]        = profile.get("full_name", "")
            item["profile_role"]        = profile.get("role", "")
            item["already_has_channel"] = "SIM" if profile.get("humand_channel_id") else "NÃO"
            item["status"]              = "MATCH"
            matched_emails.add(email)
        else:
            item["profile_id"]          = ""
            item["profile_name"]        = ""
            item["profile_role"]        = ""
            item["already_has_channel"] = ""
            item["status"]              = "SEM_PERFIL_SUPABASE" if email else "SEM_EMAIL"

    unmatched = [p for e, p in profiles_by_email.items() if e not in matched_emails]

    print(f"   MATCH:                 {sum(1 for i in mapping if i['status'] == 'MATCH')}")
    print(f"   SEM_PERFIL_SUPABASE:   {sum(1 for i in mapping if i['status'] == 'SEM_PERFIL_SUPABASE')}")
    print(f"   SEM_EMAIL:             {sum(1 for i in mapping if i['status'] == 'SEM_EMAIL')}")
    print(f"   Perfis sem Humand DM:  {len(unmatched)}")

    return mapping, unmatched

# ---------------------------------------------------------------------------
# Exportar CSVs
# ---------------------------------------------------------------------------

def export_channels_csv(mapping: list[dict], filename: str) -> None:
    if not mapping:
        print(f"\n   Nenhum canal para exportar.")
        return
    fieldnames = ["status", "email", "humand_name", "channel_id", "humand_user_id",
                  "profile_id", "profile_name", "profile_role", "already_has_channel"]
    with open(filename, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(mapping)
    print(f"   Salvo: '{filename}' ({len(mapping)} linhas)")


def export_unmatched_csv(profiles: list[dict], filename: str) -> None:
    if not profiles:
        print(f"   Todos os perfis Supabase têm correspondência no Humand.")
        return
    fieldnames = ["id", "full_name", "email", "role", "humand_channel_id"]
    with open(filename, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(profiles)
    print(f"   Salvo: '{filename}' ({len(profiles)} perfis sem canal Humand)")

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    # -----------------------------------------------------------------------
    # ETAPA 1: Teste de envio de mensagem
    # Preencha um channel_id real abaixo para validar o token e o endpoint.
    # Se não souber o ID ainda, deixe None e o script pula esta etapa.
    # -----------------------------------------------------------------------
    TEST_CHANNEL_ID = None  # ex: "01JRVR4ANN2S2AQ7MBNQ4MQRNT"

    if TEST_CHANNEL_ID:
        success = test_send_message(TEST_CHANNEL_ID)
        if not success:
            print("\nAbortando — corrija o erro de envio antes de continuar.")
            return
    else:
        print("=" * 60)
        print("ETAPA 1 — PULADA (TEST_CHANNEL_ID não definido)")
        print("   Preencha TEST_CHANNEL_ID no script para testar o envio.")

    # -----------------------------------------------------------------------
    # ETAPA 2: Buscar conversas e gerar CSV
    # -----------------------------------------------------------------------
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    conversations = fetch_conversations()
    if not conversations:
        print("\nNenhuma conversa retornada. O token pode não ter permissão para listar DMs.")
        return

    mapping = extract_dm_mapping(conversations)
    if not mapping:
        print("\nNenhum canal DM extraído.")
        return

    profiles_by_email = fetch_supabase_profiles(supabase)
    enriched_mapping, unmatched_profiles = cross_reference(mapping, profiles_by_email)

    print("\n   Exportando CSVs...")
    export_channels_csv(enriched_mapping, CSV_CHANNELS)
    export_unmatched_csv(unmatched_profiles, CSV_UNMATCHED)

    print("\n" + "=" * 60)
    print("Pronto! Revise os CSVs antes de rodar o sync.")
    print(f"  → {CSV_CHANNELS}")
    print(f"  → {CSV_UNMATCHED}")
    print("=" * 60)


if __name__ == "__main__":
    main()
