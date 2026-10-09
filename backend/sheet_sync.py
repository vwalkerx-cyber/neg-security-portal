import json
import csv
import io
import urllib.request
from datetime import datetime, timezone

SHEET_ID = "1xLu8GCguCa0J2GgTWYoRK8wVORh3jaEKEFJOQeFHA7o"
CSV_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv"

month_map = {
    "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04", "May": "05", "Jun": "06",
    "Jul": "07", "Aug": "08", "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12"
}

def clean_date(d_str):
    d_str = d_str.strip()
    if not d_str or d_str == "-":
        return "2026-01-01"
    parts = d_str.split()
    if len(parts) == 3 and parts[1] in month_map:
        day = parts[0].zfill(2)
        month = month_map[parts[1]]
        year = parts[2]
        return f"{year}-{month}-{day}"
    return d_str

def fetch_live_sheet_personnel():
    req = urllib.request.Request(CSV_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        text = resp.read().decode("utf-8")

    reader = csv.reader(io.StringIO(text))
    rows = list(reader)
    if not rows or len(rows) < 2:
        return []

    personnel_list = []
    idx = 1
    for r in rows[1:]:
        if not r or len(r) < 7:
            continue
        name = r[0].strip()
        if not name:
            continue
        
        badge_id = r[1].strip()
        if badge_id.startswith("=AI") or badge_id == "-":
            badge_id = "-"
        elif not badge_id:
            badge_id = "-"

        rank = r[3].strip() or "Officer I"
        join_date = clean_date(r[4].strip())
        license_cert = r[5].strip()
        if not license_cert or license_cert == "-":
            license_cert = "Standard Guard License"

        status = r[6].strip()
        if status not in ["Active", "Inactive", "Disbanded"]:
            status = "Active" if "Active" in status else ("Disbanded" if "Disbanded" in status else "Inactive")

        personnel_list.append({
            "id": f"NEG-{idx:03d}",
            "name": name,
            "badge_id": badge_id,
            "rank": rank,
            "join_date": join_date,
            "license_certificate": license_cert,
            "status": status,
        })
        idx += 1

    return personnel_list

def generate_users_from_personnel(personnel_list):
    role_map = {
        "Director": "ADMIN",
        "Deputy Director": "ADMIN",
        "Master Sergeant": "OFFICER",
        "Staff Sergeant": "OFFICER",
        "Sergeant": "OFFICER",
        "Senior Corporal": "ARMORER",
        "Corporal": "OFFICER",
        "Senior Officer II": "OFFICER",
        "Senior Officer I": "OFFICER",
        "Officer II": "OFFICER",
        "Officer I": "OFFICER",
    }

    # Always provide master 'commander' login
    nathan = next((p for p in personnel_list if "Nathan" in p["name"]), personnel_list[0] if personnel_list else None)

    users = [
        {
            "id": "USR-001",
            "username": "commander",
            "password": "NegAdmin2026!",
            "personnel_id": nathan["id"] if nathan else "NEG-001",
            "name": nathan["name"] if nathan else "Chief Commander",
            "rank": nathan["rank"] if nathan else "Director",
            "role": "ADMIN",
            "status": "Active",
            "created_at": "2026-10-01 08:00",
            "created_by": "System Provisioning",
            "last_login": "2026-10-08 00:01",
        }
    ]

    seen_usernames = {"commander"}
    user_idx = 2

    for p in personnel_list:
        clean_parts = [part.lower() for part in p["name"].split() if len(part) > 1]
        if not clean_parts:
            clean_parts = [p["name"].lower().replace(" ", "")]
        if len(clean_parts) >= 2:
            uname = f"{clean_parts[0]}.{clean_parts[-1]}"
        else:
            uname = clean_parts[0]

        if uname in seen_usernames:
            b_tag = p['badge_id'].lower().replace('-', '') if p['badge_id'] != '-' else p['id'].lower().replace('-', '')
            uname = f"{uname}.{b_tag}"

        seen_usernames.add(uname)

        role = role_map.get(p["rank"], "OFFICER")
        if p["name"] == "Simon Romanov" or "Armory" in p.get("license_certificate", ""):
            role = "ARMORER"

        users.append({
            "id": f"USR-{user_idx:03d}",
            "username": uname,
            "password": "NegGuard2026!",
            "personnel_id": p["id"],
            "name": p["name"],
            "rank": p["rank"],
            "role": role,
            "status": p["status"],
            "created_at": "2026-10-01 08:00",
            "created_by": "System Provisioning",
            "last_login": "--",
        })
        user_idx += 1

    return users
