import time
import os
import requests

HUMAND_BASE_URL = "https://api-prod.humand.co/api/v1"
HUMAND_AUTH     = "Basic ODQwNDU3NjpqMVdzTDVwRnB5QlgteEhHTjNtMDNWc3djSDJMTFhYMg=="

TARGET_NAME    = "PEDRO AUGUSTO BARBOSA BORGES"
TARGET_EMP_ID  = "03723880193"  # CPF como employee_internal_id
MESSAGE     = "Oi Pedro"


def _ulid() -> str:
    t     = int(time.time() * 1000)
    t_enc = ""
    chars = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
    for _ in range(10):
        t_enc = chars[t % 32] + t_enc
        t //= 32
    rand_enc = "".join(chars[b % 32] for b in os.urandom(16))
    return t_enc + rand_enc


def open_conversation(employee_id: str) -> str | None:
    url     = f"{HUMAND_BASE_URL}/marty/conversations.open"
    headers = {
        "Authorization":   HUMAND_AUTH,
        "Content-Type":    "application/json",
        "Idempotency-Key": _ulid(),
    }
    body = {"external_ids": [employee_id]}

    response = requests.post(url, headers=headers, json=body, timeout=30)
    print(f"  conversations.open → Status: {response.status_code}")
    print(f"  Body: {response.text[:300]}")

    if not response.ok:
        return None

    data = response.json()
    return data.get("channel", {}).get("id")


# Abrir (ou recuperar) canal DM com Pedro via employee_internal_id (CPF)
print(f"Abrindo canal DM para employee_id '{TARGET_EMP_ID}'...")
channel_id = open_conversation(TARGET_EMP_ID)

if not channel_id:
    print("Não foi possível abrir o canal.")
    exit(1)

print(f"  Canal: {channel_id}")

# Enviar mensagem
url = f"{HUMAND_BASE_URL}/marty/chat.postMessage"
headers = {
    "Authorization":   HUMAND_AUTH,
    "Content-Type":    "application/json",
    "Idempotency-Key": _ulid(),
}
body = {
    "channel": channel_id,
    "text":    MESSAGE,
    "mrkdwn":  False,
}

print(f"Enviando '{MESSAGE}' para canal {channel_id}...")
response = requests.post(url, headers=headers, json=body, timeout=30)
print(f"Status: {response.status_code}")
print(f"Body:   {response.text}")
