import time
import os
import requests

HUMAND_BASE_URL = "https://api-prod.humand.co/api/v1"
HUMAND_AUTH     = "Basic ODQwNDU3NjpqMVdzTDVwRnB5QlgteEhHTjNtMDNWc3djSDJMTFhYMg=="

CHANNEL_ID = "01KNYDT7VGEK3VCNFEB0CQ4X12"
MESSAGE_TS = "01KNYDT985EBJR9E6S7VZCN5H1"


def _ulid() -> str:
    t     = int(time.time() * 1000)
    t_enc = ""
    chars = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
    for _ in range(10):
        t_enc = chars[t % 32] + t_enc
        t //= 32
    rand_enc = "".join(chars[b % 32] for b in os.urandom(16))
    return t_enc + rand_enc


url = f"{HUMAND_BASE_URL}/marty/chat.delete"

headers = {
    "Authorization":   HUMAND_AUTH,
    "Content-Type":    "application/json",
    "Idempotency-Key": _ulid(),
}
body = {
    "channel": CHANNEL_ID,
    "ts":      MESSAGE_TS,
}

print(f"Deletando mensagem {MESSAGE_TS} do canal {CHANNEL_ID}...")
response = requests.delete(url, headers=headers, json=body, timeout=30)
print(f"Status: {response.status_code}")
print(f"Body:   {response.text}")
