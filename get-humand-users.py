"""
get-humand-users.py

Busca usuários da API da Humand (GET /public/api/v1/users)
com paginação automática, limitando a 1000 registros, e exporta para CSV.

Uso:
    pip install requests
    python get-humand-users.py

Saída:
    humand_users.csv — até 1000 usuários encontrados no Humand
"""

import csv
import json
import requests

# ---------------------------------------------------------------------------
# Configuração
# ---------------------------------------------------------------------------

HUMAND_BASE_URL = "https://api-prod.humand.co/public/api/v1"
HUMAND_AUTH     = "Basic ODQwNDU3NjpqMVdzTDVwRnB5QlgteEhHTjNtMDNWc3djSDJMTFhYMg=="

PAGE_LIMIT  = 50     # usuários por página (máx que a API permite)
MAX_USERS   = 500   # limite de usuários a serem buscados
CSV_FILE    = "humand_users.csv"

# ---------------------------------------------------------------------------
# Buscar usuários com paginação (com limite)
# ---------------------------------------------------------------------------

def fetch_all_users() -> list[dict]:
    url     = f"{HUMAND_BASE_URL}/users"
    headers = {"Authorization": HUMAND_AUTH}
    all_users = []
    page = 1

    print("=" * 60)
    print("Buscando usuários na API da Humand...")
    print(f"URL: {url}")
    print()

    while True:
        params = {"page": page, "limit": PAGE_LIMIT}
        response = requests.get(url, headers=headers, params=params, timeout=30)

        print(f"  Página {page} → Status {response.status_code}")

        if not response.ok:
            print(f"  Body: {response.text[:300]}")
            if response.status_code == 401:
                print("  → Token inválido. Verifique HUMAND_AUTH.")
            elif response.status_code == 429:
                print("  → Rate limit atingido. Aguarde e tente novamente.")
            response.raise_for_status()

        data  = response.json()
        users = data.get("users", [])
        total = data.get("count", 0)

        all_users.extend(users)
        print(f"  Página {page}: {len(users)} usuário(s) | Total acumulado: {len(all_users)}/{total}")

        # Interrompe o loop se atingiu ou ultrapassou o limite definido
        if len(all_users) >= MAX_USERS:
            all_users = all_users[:MAX_USERS] # Garante que a lista não passe de 1000
            print(f"\n  → Limite de {MAX_USERS} usuários atingido. Interrompendo a busca.")
            break

        # Se trouxe menos do que o limite, chegamos na última página antes de atingir MAX_USERS
        if len(users) < PAGE_LIMIT:
            break

        page += 1

    print(f"\nTotal de usuários retornados para exportação: {len(all_users)}")
    return all_users

# ---------------------------------------------------------------------------
# Exportar para CSV
# ---------------------------------------------------------------------------

def export_to_csv(users: list[dict], filename: str) -> None:
    if not users:
        print("Nenhum usuário para exportar.")
        return

    fieldnames = [
        "id",
        "status",
        "email",
        "firstName",
        "lastName",
        "nickname",
        "phoneNumber",
        "employeeInternalId",
        "hiringDate",
        "birthdate",
    ]

    print(f"\nExportando para '{filename}'...")

    with open(filename, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(users)

    print(f"Salvo: '{filename}' ({len(users)} usuários)")

# ---------------------------------------------------------------------------
# Inspecionar estrutura do primeiro usuário (debug)
# ---------------------------------------------------------------------------

def inspect_user(user: dict) -> None:
    print("\nEstrutura do primeiro usuário:")
    print(json.dumps(user, indent=2, ensure_ascii=False)[:1500])

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    users = fetch_all_users()

    if not users:
        print("Nenhum usuário retornado. Verifique o token.")
        return

    inspect_user(users[0])
    export_to_csv(users, CSV_FILE)

    print("\n" + "=" * 60)
    print(f"Pronto! {len(users)} usuários exportados para '{CSV_FILE}'")
    print("=" * 60)

if __name__ == "__main__":
    main()