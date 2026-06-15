import requests
from bs4 import BeautifulSoup
import re
import time

test_handles = [
    "vesticrimea",
    "crimea_chp",
    "crimeapress",
    "crimea_operativno",
    "chp_simferopol",
    "crimeachp",
    "crimea_oper",
    "krym_chp",
    "typical_simferopol",
    "typical_sevastopol",
    "crimea_travel",
    "crimea_active",
    "saki_life",
    "evpa_live",
    "sevastopol_live",
    "alushta_live",
    "sudak_news",
    "bakhchisarai_life",
    "dzhankoy_live",
    "crimeapress_ru",
    "crimea_emergencies",
    "krym24tv",
    "kerchcomua",
    "crimea_news"
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

working = []

for handle in test_handles:
    url = f"https://t.me/{handle}"
    try:
        r = requests.get(url, headers=HEADERS, timeout=5)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, "html.parser")
            desc_elem = soup.find("meta", property="og:description")
            sub_count = 0
            if desc_elem:
                desc = desc_elem.get("content", "")
                sub_match = re.search(r"([\d\s\u00a0]+)\s*(subscribers|members|подписчиков|участников)", desc, re.IGNORECASE)
                if sub_match:
                    cleaned_num = sub_match.group(1).replace("\xa0", "").replace(" ", "").replace("\u00a0", "").strip()
                    sub_count = int(cleaned_num)
            
            # If sub_count > 0, it exists and has members
            if sub_count > 0:
                print(f"FOUND: @{handle} with {sub_count} subscribers")
                working.append({"handle": handle, "subs": sub_count})
            else:
                print(f"FAILED: @{handle} (No subscribers found in metadata)")
        else:
            print(f"FAILED: @{handle} (HTTP {r.status_code})")
    except Exception as e:
        print(f"ERROR: @{handle}: {e}")
    time.sleep(1.0)

print("\n--- WORKING HANDLES ---")
for w in working:
    print(f"  {w['handle']}: {w['subs']}")
