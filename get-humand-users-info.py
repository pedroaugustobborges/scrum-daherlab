"""
get-humand-users-info.py

1. Busca até 1000 usuários via GET /public/api/v1/users (já funciona)
2. Para cada usuário (ID inteiro), chama GET /public/api/v1/marty/users.info?user=<id>
3. Extrai o ID string do Humand (user.id) e o e-mail (user.profile.email)
4. Exporta CSV com: humand_int_id, humand_string_id, email, name

Uso:
    pip install requests
    python get-humand-users-info.py
"""

import csv
import json
import time
import requests

# ---------------------------------------------------------------------------
# Configuração
# ---------------------------------------------------------------------------

HUMAND_BASE_URL = "https://api-prod.humand.co/public/api/v1"
HUMAND_AUTH     = "Basic NTc1MDQwNTpTc2lRZlNrWlhaNmd4aEdwYWNBS3JJMUJac2M4eEZyMA=="

PAGE_LIMIT  = 50
MAX_USERS   = 1000
CSV_FILE    = "humand_users_info.csv"

DELAY_BETWEEN_REQUESTS = 0.2  # segundos entre chamadas a users.info (evita rate limit)

# ---------------------------------------------------------------------------
# Passo 1 — Buscar lista de usuários (IDs inteiros)
# ---------------------------------------------------------------------------

def fetch_user_list() -> list[dict]:
    url     = f"{HUMAND_BASE_URL}/users"
    headers = {"Authorization": HUMAND_AUTH}
    all_users = []
    page = 1

    print("=" * 60)
    print("PASSO 1 — Buscando lista de usuários (/users)...")
    print(f"URL: {url}")
    print()

    while True:
        params   = {"page": page, "limit": PAGE_LIMIT}
        response = requests.get(url, headers=headers, params=params, timeout=30)

        if not response.ok:
            print(f"  ERRO {response.status_code}: {response.text[:300]}")
            response.raise_for_status()

        data  = response.json()
        users = data.get("users", [])
        total = data.get("count", 0)

        all_users.extend(users)
        print(f"  Página {page}: {len(users)} usuário(s) | Acumulado: {len(all_users)}/{total}")

        if len(all_users) >= MAX_USERS:
            all_users = all_users[:MAX_USERS]
            print(f"\n  → Limite de {MAX_USERS} atingido.")
            break

        if len(users) < PAGE_LIMIT:
            break

        page += 1

    print(f"\nTotal de usuários na lista: {len(all_users)}\n")
    return all_users

# ---------------------------------------------------------------------------
# Passo 2 — Buscar users.info para cada usuário
# ---------------------------------------------------------------------------

def fetch_user_info(int_id: int) -> dict | None:
    url     = f"{HUMAND_BASE_URL}/marty/users.info"
    headers = {"Authorization": HUMAND_AUTH}
    params  = {"user": int_id}

    response = requests.get(url, headers=headers, params=params, timeout=30)

    if not response.ok:
        print(f"  ERRO {response.status_code} para user={int_id}: {response.text[:200]}")
        return None

    data = response.json()

    # Debug: mostra estrutura do primeiro usuário
    if int_id == -1:  # nunca executa, flag para debug manual
        print(json.dumps(data, indent=2, ensure_ascii=False)[:2000])

    return data.get("user") or data  # a API pode retornar {"user": {...}} ou diretamente o objeto


def fetch_all_user_info(user_list: list[dict]) -> list[dict]:
    print("=" * 60)
    print(f"PASSO 2 — Buscando users.info para {len(user_list)} usuários...")
    print()

    results = []
    errors  = 0

    # Inspeciona o primeiro usuário para entender a estrutura real
    first_int_id = user_list[0]["id"]
    print(f"  Inspecionando estrutura do primeiro usuário (id={first_int_id})...")
    sample = fetch_user_info(first_int_id)
    if sample:
        print(json.dumps(sample, indent=2, ensure_ascii=False)[:1500])
    print()

    for i, user in enumerate(user_list):
        int_id = user["id"]

        info = fetch_user_info(int_id)

        if info is None:
            errors += 1
            results.append({
                "humand_int_id":    int_id,
                "humand_string_id": "",
                "email":            user.get("email", ""),
                "name":             f"{user.get('firstName','')} {user.get('lastName','')}".strip(),
                "status":           "ERROR",
            })
        else:
            # Tenta extrair o ID string e e-mail da resposta
            string_id = info.get("id", "")
            profile   = info.get("profile", {})
            email     = (
                profile.get("email")
                or info.get("email")
                or user.get("email", "")
            )
            name = (
                info.get("real_name")
                or info.get("name")
                or f"{user.get('firstName','')} {user.get('lastName','')}".strip()
            )

            results.append({
                "humand_int_id":    int_id,
                "humand_string_id": string_id,
                "email":            email,
                "name":             name,
                "status":           "OK",
            })

        if (i + 1) % 50 == 0:
            print(f"  Processados: {i + 1}/{len(user_list)} | Erros: {errors}")

        time.sleep(DELAY_BETWEEN_REQUESTS)

    print(f"\nConcluído: {len(results)} processados | {errors} erro(s)")
    return results

# ---------------------------------------------------------------------------
# Exportar CSV
# ---------------------------------------------------------------------------

def export_csv(rows: list[dict], filename: str) -> None:
    if not rows:
        print("Nenhum dado para exportar.")
        return

    fieldnames = ["humand_int_id", "humand_string_id", "email", "name", "status"]

    with open(filename, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)

    ok_count  = sum(1 for r in rows if r["status"] == "OK")
    err_count = sum(1 for r in rows if r["status"] == "ERROR")
    print(f"\nSalvo: '{filename}' ({len(rows)} linhas | {ok_count} OK | {err_count} erro(s))")

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    user_list = fetch_user_list()

    if not user_list:
        print("Nenhum usuário retornado. Verifique o token.")
        return

    info_rows = fetch_all_user_info(user_list)
    export_csv(info_rows, CSV_FILE)

    print("\n" + "=" * 60)
    print(f"Pronto! Dados exportados para '{CSV_FILE}'")
    print("=" * 60)


if __name__ == "__main__":
    main()
