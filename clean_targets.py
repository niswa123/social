import json
import requests
from bs4 import BeautifulSoup
import re
import time

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}
HEADERS_VK = {
    "User-Agent": "Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "ru-RU,ru;q=0.9"
}

with open("targets.json", "r", encoding="utf-8") as f:
    targets = json.load(f)

cleaned = []

for t in targets:
    plat = t["platform"]
    handle = t["handle"]
    
    if plat == "telegram":
        print(f"Checking Telegram: @{handle}...")
        url = f"https://t.me/{handle}"
        try:
            r = requests.get(url, headers=HEADERS, timeout=10)
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, "html.parser")
                sub_count = 0
                
                extra = soup.find(class_="tgme_page_extra")
                if extra:
                    extra_text = extra.text.strip().replace(" ", "").replace("\xa0", "").replace("\u00a0", "")
                    sub_match = re.search(r"([\d]+)\s*(subscribers|members|подписчиков|участников)", extra_text, re.IGNORECASE)
                    if sub_match:
                        sub_count = int(sub_match.group(1))
                
                if sub_count == 0:
                    desc_elem = soup.find("meta", property="og:description")
                    if desc_elem:
                        desc = desc_elem.get("content", "")
                        sub_match = re.search(r"([\d\s\u00a0]+)\s*(subscribers|members|подписчиков|участников)", desc, re.IGNORECASE)
                        if sub_match:
                            cleaned_num = sub_match.group(1).replace("\xa0", "").replace(" ", "").replace("\u00a0", "").strip()
                            try:
                                sub_count = int(cleaned_num)
                            except ValueError:
                                pass
                
                # Check if we get some subscriber count
                if sub_count > 1000: # popular channel threshold
                    print(f"  -> KEEP: {sub_count} subs")
                    cleaned.append(t)
                else:
                    print(f"  -> REMOVE: too few subs ({sub_count}) or doesn't exist")
            else:
                print(f"  -> REMOVE: HTTP {r.status_code}")
        except Exception as e:
            print(f"  -> ERROR checking @{handle}: {e}")
        time.sleep(1.0)
        
    elif plat == "vk":
        print(f"Checking VK: vk.com/{handle}...")
        url = f"https://vk.com/{handle}"
        try:
            r = requests.get(url, headers=HEADERS_VK, timeout=10)
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, "html.parser")
                sub_count = 0
                
                header_counts = soup.find_all("span", class_="header_count")
                if header_counts:
                    sub_text = header_counts[0].text.strip().replace(" ", "").replace("\xa0", "").replace("\u00a0", "")
                    try:
                        sub_count = int(sub_text)
                    except ValueError:
                        pass
                
                if sub_count == 0:
                    text = soup.get_text()
                    sub_match = re.search(r"([\d\s\xa0 ]+)\s*подписчик", text, re.IGNORECASE)
                    if sub_match:
                        num_str = sub_match.group(1).replace(" ", "").replace("\xa0", "").replace("\u00a0", "").strip()
                        try:
                            sub_count = int(num_str)
                        except ValueError:
                            pass
                
                if sub_count > 1000:
                    print(f"  -> KEEP: {sub_count} subs")
                    cleaned.append(t)
                else:
                    print(f"  -> REMOVE: too few subs ({sub_count}) or doesn't exist")
            else:
                print(f"  -> REMOVE: HTTP {r.status_code}")
        except Exception as e:
            print(f"  -> ERROR checking VK @{handle}: {e}")
        time.sleep(1.0)
        
    else:
        # Keep real, popular fallbacks (like crimea_life, vesticrimea, CrimeaUA1, etc.)
        # Remove custom generated Max/OK/Instagram test placeholders that have no basis
        if "Max" in handle or "ok" in handle or "_" not in handle and len(handle) > 15:
            print(f"Skipping placeholder target: @{handle} ({plat})")
        else:
            print(f"Keeping fallback target: @{handle} for {plat.upper()}")
            cleaned.append(t)

with open("targets.json", "w", encoding="utf-8") as f:
    json.dump(cleaned, f, indent=2, ensure_ascii=False)

print(f"\nCompleted cleaning targets.json. Retained {len(cleaned)} targets.")
