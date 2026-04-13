"""
get-humand-bot-channels.py

Lista os canais DM disponíveis para o bot via conversations.list.
Use os channel IDs retornados para enviar mensagens com o bot.
"""

import json
import requests

HUMAND_BASE_URL = "https://api-prod.humand.co/api/v1"
HUMAND_AUTH     = "Basic ODQwNDU3NjpqMVdzTDVwRnB5QlgteEhHTjNtMDNWc3djSDJMTFhYMg=="

url     = f"{HUMAND_BASE_URL}/marty/conversations.list"
headers = {"Authorization": HUMAND_AUTH}

print(f"GET {url}\n")
response = requests.get(url, headers=headers, timeout=30)
print(f"Status: {response.status_code}")

if not response.ok:
    print(f"Erro: {response.text}")
    exit(1)

data          = response.json()
channels = data.get("channels", data.get("conversations", []))

print(f"Total de canais: {len(channels)}\n")

if not channels:
    print("Resposta completa:")
    print(json.dumps(data, indent=2, ensure_ascii=False)[:3000])
else:
    # Filtra apenas DMs
    dms = [c for c in channels if c.get("is_im") or c.get("type") == "im"]
    print(f"DMs encontrados: {len(dms)}\n")
    for dm in dms:
        channel_id   = dm.get("id", "")
        other_member = dm.get("hu_data", {}).get("other_membership", {}).get("user", {})
        hu_member    = other_member.get("hu_data", {}).get("member", {})
        name  = f"{hu_member.get('first_name', '')} {hu_member.get('last_name', '')}".strip() or other_member.get("name", "?")
        email = other_member.get("profile", {}).get("email", "")
        int_id = hu_member.get("id", "?")
        print(f"  {channel_id}  |  ID:{int_id}  |  {name}  |  {email or '(sem email)'}")

    print("\nPrimeiro canal (estrutura completa):")
    print(json.dumps(channels[0], indent=2, ensure_ascii=False)[:2000])
