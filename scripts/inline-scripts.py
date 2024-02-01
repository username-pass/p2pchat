from bs4 import BeautifulSoup
import requests
import re
import sys

html_file_path = sys.argv[1]

with open(html_file_path, "r") as file:
    soup = BeautifulSoup(file, "html.parser")

for script_tag in soup.find_all("script", src=True):
    script_src = script_tag["src"]
    script_content = ""
    if (script_src.startswith("./")):
        script_src = script_src[2:]
        with open(script_src, "r") as file:
            script_content = file.read()
    else:
        script_content = requests.get(script_src).text  # Use requests to fetch script content, adjust as needed
    script_tag.string = script_content
    script_src = ""

# Save the modified HTML to a new file
with open("inlined.html", "w+") as new_file:
    new_file.write(str(soup))
