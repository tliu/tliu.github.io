from bs4 import BeautifulSoup
from urllib.request import Request, urlopen
import json

url = 'https://www.streetfighter.com/6/en-us/character'
headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36'}
req = Request(url, headers=headers) 
con = urlopen(req)
page = con.read()

soup = BeautifulSoup(page, features='html.parser')
soup.prettify()

characters = []

for anchor in soup.findAll('a', href=True):     
    href = anchor['href']
    if ('6/character/') in anchor['href']:
        characters.append(href.split('/')[-1])
input_dict = {
    "key-dl": "1",
    "key-d": "2",
    "key-dr": "3",
    "key-l": "4",
    "key-lc": "4",
    "key-r": "6",
    "key-ul": "7",
    "key-u": "8",
    "key-ur": "9",
    "icon_kick_l": "LK",
    "icon_kick_m": "MK",
    "icon_kick_h": "HK",
    "icon_punch_l": "LP",
    "icon_punch_m": "MP",
    "icon_punch_h": "HP",
    "icon_kick": "K",
    "icon_punch": "P",
}


class Move:
    def __init__(self, name, startup, active, recovery, total, hit, block, chainable, input_str, isNormal):
        self.name = name
        self.startup = startup
        self.active = active
        self.recovery = recovery
        self.total = total
        self.hit = hit
        self.block = block
        self.chainable = chainable
        self.input = input_str
        self.isNormal = isNormal

    def toJson(self):
        return json.dumps(
                self, 
                default = lambda o: o.__dict__,
                sort_keys = True,
                indent = 4)

f_url = 'https://www.streetfighter.com/6/character/{character}/frame'
def get_frame_data(character):
    moves = []
    headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36'}
    req = Request(f_url.format(character=character), headers=headers) 
    con = urlopen(req)
    page = con.read()

    soup = BeautifulSoup(page, features='html.parser')
    soup.prettify()

    for tr in soup.findAll("tr"):
        try:
            t = tr.findAll("td")
            if (len(t) <= 1):
                continue
            name = t[0].find("span").getText()
            print(name)
            if "Drive Reversal" in name:
                continue
            if "Chain combo" in name:
                continue
            if "Jumping" in name:
                continue
            if "Cancel Drive Rush" in name:
                continue
            if "Forward Dash" in name:
                total = t[3].getText().split(" ")[0]
                moves.append(Move(name, total, 0, 0, total, 0, 0, False, "66", False))
                continue

            inputs = map(lambda x: x["src"], t[0].findAll("img"))
            input_str = ""
            for i in inputs:
                imgsrc = i.split("/")[-1].split(".")[0]
                if imgsrc == "arrow_3":
                    raise Exception("skip me")
                try: 
                    input_str += input_dict[imgsrc]
                except:
                    continue

            if len(input_str) == 2:
                input_str = "5" + input_str

            print("hurr")
            startup = int(t[1].getText())
            if "landing" in t[2].getText() or "landing" in t[3].getText():
                continue
            activeText = t[2].getText().split("-")
            if len(activeText) > 0:
                active = int(activeText[-1]) - int(activeText[0]) + 1
            print("hurr1")
            rec = t[3].getText()
            if "*" in rec:
                rec = rec[1:]
            recovery = int(rec)
            print("hurr2")
            hit = t[4].getText()
            block = t[5].getText()
            misc = t[14].getText()
            chainable = False
            if "Can be rapid canceled" in misc:
                chainable = True

            if character != "juri"  and "attack misses" in misc:
                recovery += int(str(t[14]).split("* ")[-1].split(" ")[0])
                
            moves.append(Move(name, startup, active, recovery, startup + active + recovery - 1, hit, block, chainable, input_str, len(input_str)==3))
        except Exception as e:
            print("skipping row", e)
    return moves

for c in characters:
    f = open(f'{c}.json', "w")
    f.write("[\n")
    data = get_frame_data(c)
    for i, m in enumerate(data):
        f.write(m.toJson())
        if i < len(data) - 1:
            f.write(",\n")
    f.write("]")
        



