# Para ejecutar el RAG en Google Colab, 
seguir el tutorial: https://python.langchain.com/docs/tutorials/rag/ Seleccione Gemini para el modelo y Google para los embeddings. Google Colab dara un entorno Linux el cual sera el sistema de producción.

# Como ejecutar el RAG localmente
Sacado del tutorial: https://python.langchain.com/docs/tutorials/rag/
Instalar las dependencias:
Primero ver si esta instalado Python, si no, instalarlo. Se verifica ejecutando en la linea de comandos `python3` en sistemas Linux basados en Ubuntu/Debian como Linux Mint, o el comando en PowerShell `python` en Windows. 
Una vez instalado Python, ejecutar en Linux en sistemas basados en Ubuntu/Debian como Linux Mint:

```
python3 -m venv path/to/venv && path/to/venv/bin/pip install langchain-text-splitters langchain-community langgraph "langchain[google-genai]" langchain-google-genai langchain-core
```

O en Windows:
```
pip install langchain-text-splitters langchain-community langgraph "langchain[google-genai]" langchain-google-genai langchain-core
```

Luego clonar el repositorio yendo al boton code en esta página, copiando el link y yendo a la seccion de Version de Control en Visual Studio Code, y clone. O con `git clone`. 
Registrese en Langsmith: https://smith.langchain.com/ Durante el proceso de registro, haga click en Generate API key, copie el codigo o key que le da y guardelo en un lugar seguro. 
Vaya a https://ai.google.dev/gemini-api/docs y haga click en Get a Gemini API key, copie el codigo o key que le da y guardelo en un lugar seguro.

Actualmente la parte de RAG fue probado en un sistema linux con linux mint 22.1. Parece que es suficientemente ligero para un servidor de 2 dolares al mes

Usando trunk based development, prompt engineering guide
