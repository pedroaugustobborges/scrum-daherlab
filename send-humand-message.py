import uuid
import requests

HUMAND_BASE_URL = "https://api-prod.humand.co/api/v1"
Authorization     = "Basic NTc1MDQwNTpTc2lRZlNrWlhaNmd4aEdwYWNBS3JJMUJac2M4eEZyMA=="

CHANNEL_ID = "01KNQ6DZYNFHSR6E9TQBBX9SWA"
MESSAGE    = "Oi Pedro"

url = f"{HUMAND_BASE_URL}/marty/chat.postMessage"

headers = {
    "Authorization":   Authorization,
    "Content-Type":    "application/json",
    "Idempotency-Key": str(uuid.uuid4()),
}
body = {
    "channel": CHANNEL_ID,
    "text":    MESSAGE,
    "mrkdwn":  False,
}

print(f"Enviando mensagem para canal {CHANNEL_ID}...")
response = requests.post(url, headers=headers, json=body, timeout=30)
print(f"Status: {response.status_code}")
print(f"Body:   {response.text}")
