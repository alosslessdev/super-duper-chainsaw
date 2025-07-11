import getpass
import os
import requests
from langchain import hub
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langgraph.graph import START, StateGraph
from typing_extensions import List, TypedDict
from langchain.chat_models import init_chat_model
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_core.vectorstores import InMemoryVectorStore
from PyPDF2 import PdfReader
from fastapi import FastAPI, Header, HTTPException, Depends, UploadFile, File
from fastapi.security import OAuth2PasswordBearer
from typing import Annotated, Optional
from pydantic import BaseModel

# Import Google Cloud Speech-to-Text
from google.cloud import speech_v1p1beta1 as speech
import io


if not os.environ.get("GOOGLE_API_KEY"):
  os.environ["GOOGLE_API_KEY"] = getpass.getpass("Enter API key for Google Gemini: ")

# Ensure GOOGLE_APPLICATION_CREDENTIALS is set for Speech-to-Text
# It's highly recommended to use a service account key file for production.
# For local development, you might set it like this:
# os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "/path/to/your/service-account-key.json"
# If you don't set it explicitly and rely on GOOGLE_API_KEY, ensure the API key
# has permissions for Speech-to-Text.

os.environ["LANGSMITH_TRACING"] = "true"
os.environ["LANGSMITH_API_KEY"] = getpass.getpass("API key for LangSmith")

API_KEY = getpass.getpass("Set API key:")
API_KEY_NAME = "X-API-Key"

app = FastAPI()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_api_key(x_api_key: Optional[str] = Header(None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return x_api_key

llm = init_chat_model("gemini-2.0-flash", model_provider="google_genai")

embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")

vector_store = InMemoryVectorStore(embeddings)

URL = "https://preguntapdf.s3.eu-south-2.amazonaws.com/BOE-A-1978-31229-consolidado.pdf"
doc_to_download = requests.get(URL)

pdf_file = open("BOE-A-1978-31229-consolidado.pdf", "wb")
pdf_file.write(doc_to_download.content)
pdf_file.close() # Close the file after writing

pdf_file_obj = open('BOE-A-1978-31229-consolidado.pdf', 'rb')
pdf_reader = PdfReader(pdf_file_obj)

text = ""
for page in pdf_reader.pages:
    text += page.extract_text()
pdf_file_obj.close() # Close the file after reading


# Docs es un string
#docs = loader.load()
docs = [Document(page_content=text)]

text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
all_splits = text_splitter.split_documents(docs)


# Index chunks
_ = vector_store.add_documents(documents=all_splits)

# Define prompt for question-answering
# N.B. for non-US LangSmith endpoints, you may need to specify
# api_url="https://api.smith.langchain.com" in hub.pull.
prompt = hub.pull("rlm/rag-prompt")


# Define state for application
class State(TypedDict):
    question: str
    context: List[Document]
    answer: str


# Define application steps
def retrieve(state: State):
    retrieved_docs = vector_store.similarity_search(state["question"])
    return {"context": retrieved_docs}


def generate(state: State):
    docs_content = "\n\n".join(doc.page_content for doc in state["context"])
    messages = prompt.invoke({"question": state["question"], "context": docs_content})
    response = llm.invoke(messages)
    return {"answer": response.content}


# Compile application and test
graph_builder = StateGraph(State).add_sequence([retrieve, generate])
graph_builder.add_edge(START, "retrieve")
graph = graph_builder.compile()


response = graph.invoke({"question": """Por favor extrae todos los pasos que debo hacer para completar lo que se plantea en este documento.  
                         Si hay una lista de puntos a hacer, muestra la lista. Escribe los resultados en formato JSON asi: {
                         "tarea": "*poner tarea aqui*", "tarea": "*poner tarea aqui*", ***Continuar patrón***}"""})

# A protected endpoint for LLM answer
@app.get("/secure-data")
async def llmAnswer(api_key: str = Depends(get_api_key)):
    return response["answer"]

# New endpoint for Speech-to-Text
@app.post("/transcribe-audio")
async def transcribe_audio(file: UploadFile = File(...), api_key: str = Depends(get_api_key)):
    """
    Transcribes an audio file using Google Speech-to-Text API.
    Supports common audio formats (e.g., WAV, FLAC, MP3).
    """
    if not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Uploaded file is not an audio file.")

    try:
        content = await file.read()

        client = speech.SpeechClient()

        audio = speech.RecognitionAudio(content=content)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16, # Adjust based on your audio encoding
            sample_rate_hertz=16000,  # Adjust based on your audio sample rate
            language_code="es-ES",    # Set the language code (e.g., "en-US" for English, "es-ES" for Spanish)
            enable_automatic_punctuation=True,
        )

        # Synchronous speech recognition request
        response = client.recognize(config=config, audio=audio)

        transcript = ""
        for result in response.results:
            transcript += result.alternatives[0].transcript + " "

        return {"transcript": transcript.strip()}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Speech-to-Text transcription failed: {str(e)}")
