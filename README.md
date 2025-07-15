# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
#Instalacion del backend
Correr `npm install axios dotenv express express-session jsonrepair mysql mysql2 pbkdf2-password swagger-ui-express`



Usando trunk based development, prompt engineering guide  


# Para ejecutar el RAG en Google Colab,  
Seguir el tutorial: https://python.langchain.com/docs/tutorials/rag/ Seleccione Gemini para el modelo y Google para los embeddings. Google Colab dara un entorno Linux el cual sera el sistema de producción.

# Como ejecutar el RAG localmente  
Sacado del tutorial: https://python.langchain.com/docs/tutorials/rag/  
Instalar las dependencias:  
Primero ver si esta instalado Python, si no, instalarlo. Se verifica ejecutando en la linea de comandos `python3` en sistemas Linux basados en Ubuntu/Debian como Linux Mint, o el comando en PowerShell `python` en Windows.  
Una vez instalado Python, ejecutar en Linux en sistemas basados en Ubuntu/Debian como Linux Mint:  

```
python3 -m venv path/to/venv && path/to/venv/bin/pip install requests PyPDF2 langchain-text-splitters langchain-community langgraph "langchain[google-genai]" langchain-google-genai langchain-core
```

O en Windows:
```
pip install langchain-text-splitters langchain-community langgraph "langchain[google-genai]" langchain-google-genai langchain-core
```

Luego clonar el repositorio yendo al boton code en esta página, copiando el link y yendo a la seccion de Version de Control en Visual Studio Code, y clone. O con `git clone`.  
Registrese en Langsmith: https://smith.langchain.com/ Durante el proceso de registro, haga click en Generate API key, copie el codigo o key que le da y guardelo en un lugar seguro.  
Vaya a https://ai.google.dev/gemini-api/docs y haga click en Get a Gemini API key, copie el codigo o key que le da y guardelo en un lugar seguro. Durante la ejecucion del programa en Visual Studio Code, el programa le pedira estos keys. Primero el de Google, luego el de LangSmith.  

Actualmente la parte de RAG fue probado en un sistema linux con linux mint 22.1. Parece que es suficientemente ligero para un servidor de 2 dolares al mes  

#Instalacion del backend
Correr `npm install axios dotenv express express-session jsonrepair mysql mysql2 pbkdf2-password swagger-ui-express`



Usando trunk based development, prompt engineering guide  
