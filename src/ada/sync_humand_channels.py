"""
sync_humand_channels.py

Fetches all direct message conversations from the Humand API and stores
the channel ID for each user in the Supabase 'profiles' table.

Usage:
    python sync_humand_channels.py

Requirements:
    pip install requests supabase
"""

import requests
from supabase import create_client, Client

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

HUMAND_BASE_URL = "https://api-prod.humand.co"
HUMAND_AUTH = "Basic ODQwNDU3NjpqMVdzTDVwRnB5QlgteEhHTjNtMDNWc3djSDJMTFhYMg=="

SUPABASE_URL = "https://vzlgssqtzerleeskhzmo.supabase.co"
# Use the service role key so we can write to the table without RLS restrictions
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6bGdzc3F0emVybGVlc2toem1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDEwNDIyMywiZXhwIjoyMDc5NjgwMjIzfQ.bGpEOAup4ayfj1pZO-uwNCG3DAAvxJXV6l_OfNtwvKE"

# Supabase table and columns to update
# Adjust TABLE_NAME / EMAIL_COLUMN if your schema uses different names
TABLE_NAME = "profiles"
EMAIL_COLUMN = "email"
CHANNEL_COLUMN = "humand_channel_id"

# ---------------------------------------------------------------------------
# Fetch conversations from Humand
# ---------------------------------------------------------------------------

def fetch_conversations() -> list[dict]:
    url = f"{HUMAND_BASE_URL}/api/v1/marty/conversations.list"
    headers = {"Authorization": HUMAND_AUTH}

    print("Fetching conversations from Humand...")
    response = requests.get(url, headers=headers, timeout=30)

    if not response.ok:
        print(f"  ERROR {response.status_code}: {response.text}")
        response.raise_for_status()

    data = response.json()
    conversations = data.get("conversations", [])
    print(f"  Found {len(conversations)} conversation(s) total.\n")

    # Debug: print raw response if empty so you can inspect the real shape
    if not conversations:
        print("  Raw response:")
        print(response.text[:2000])

    return conversations

# ---------------------------------------------------------------------------
# Extract DM channel → email mapping
# ---------------------------------------------------------------------------

def extract_dm_mapping(conversations: list[dict]) -> list[dict]:
    """
    Returns a list of dicts: [{"email": "...", "channel_id": "..."}]

    Humand's API is Slack-like. Direct messages have type "im" and the
    other participant is available under hu_data.other_user.
    Adjust the field paths below if the actual response shape differs.
    """
    mapping = []

    for conv in conversations:
        conv_type = conv.get("type", "")

        # Skip group channels, only process direct messages
        if conv_type != "im":
            continue

        channel_id = conv.get("id")
        other_user = conv.get("hu_data", {}).get("other_user", {})
        email = other_user.get("email") or other_user.get("profile", {}).get("email")

        if not channel_id:
            continue

        if not email:
            name = other_user.get("name", "unknown")
            print(f"  SKIP  channel {channel_id} — no email found for user '{name}'")
            continue

        mapping.append({"email": email, "channel_id": channel_id})

    return mapping

# ---------------------------------------------------------------------------
# Update Supabase
# ---------------------------------------------------------------------------

def update_supabase(supabase: Client, mapping: list[dict]) -> None:
    if not mapping:
        print("No DM channels to sync.")
        return

    print(f"Syncing {len(mapping)} DM channel(s) to Supabase table '{TABLE_NAME}':\n")

    updated = 0
    not_found = 0

    for item in mapping:
        email = item["email"]
        channel_id = item["channel_id"]

        result = (
            supabase.table(TABLE_NAME)
            .update({CHANNEL_COLUMN: channel_id})
            .eq(EMAIL_COLUMN, email)
            .execute()
        )

        rows_affected = len(result.data) if result.data else 0

        if rows_affected > 0:
            print(f"  OK    {email}  →  {channel_id}")
            updated += 1
        else:
            print(f"  MISS  {email}  →  {channel_id}  (no matching row in '{TABLE_NAME}')")
            not_found += 1

    print(f"\nDone. {updated} updated, {not_found} not found in Supabase.")

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    conversations = fetch_conversations()
    mapping = extract_dm_mapping(conversations)

    # Print what we found before touching the DB
    print(f"DM channels found: {len(mapping)}")
    for item in mapping:
        print(f"  {item['email']}  →  {item['channel_id']}")
    print()

    if not mapping:
        print("Nothing to update. Check the field paths in extract_dm_mapping() if this is unexpected.")
        return

    update_supabase(supabase, mapping)


if __name__ == "__main__":
    main()
