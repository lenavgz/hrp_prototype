# hrp_prototype
Prototype for the hci research project - a interactive embodyment of an LLM that teaches users basic mechanisms of LLMs

*** packages ***
to install packages paste this in your terminal (eg powershell)

py -m pip install -r requirements.txt

evtl noch das modell installieren
ollama pull llama3.2


*** run code ***
py app.py (for GUI)

or

py ai_engine.py

*** API Usage ***
-> duplicate .env folder (erase example)
-> create an api key on ollama
-> paste it in the .env folder 
!!! do not upload your API key on github !!!
per default .env folders are not pushed but check that 

*** Simulator and Arduino ***
# Simulator ist DEFAULT (true):
$env:USE_SIMULATOR = "true"
py app.py

# Schalte auf echten Arduino:
$env:USE_SIMULATOR = "false"
py app.py