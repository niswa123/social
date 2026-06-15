import requests
from bs4 import BeautifulSoup

url = "https://t.me/vesticrimea"
r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=5)
print(f"HTTP Status: {r.status_code}")
if r.status_code == 200:
    soup = BeautifulSoup(r.text, "html.parser")
    desc = soup.find("meta", property="og:description")
    if desc:
        print("og:description:", desc.get("content"))
    else:
        print("og:description not found!")
    
    extra = soup.find(class_="tgme_page_extra")
    if extra:
        print("tgme_page_extra:", extra.text.strip())
    else:
        print("tgme_page_extra not found!")
    
    # Print a snippet of the page text
    print("Page text snippet:", soup.text[:500])
