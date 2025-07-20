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


if not os.environ.get("GOOGLE_API_KEY"):
  os.environ["GOOGLE_API_KEY"] = getpass.getpass("Enter API key for Google Gemini: ")

# Ensure GOOGLE_APPLICATION_CREDENTIALS is set for Speech-to-Text
# It's highly recommended to use a service account key file for production.
# For local development, you might set it like this:
# os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "/path/to/your/service-account-key.json"
# If you don't set it explicitly and rely on GOOGLE_API_KEY, ensure the API key
# has permissions for Speech-to-Text.

os.environ["LANGSMITH_TRACING"] = "true"
os.environ["LANGSMITH_API_KEY"] = getpass.getpass("API key for LangSmith: ")

API_KEY = getpass.getpass("Set API key: ")

app = FastAPI()

def get_api_key(x_api_key: Optional[str] = Header(None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return x_api_key


llm = init_chat_model("gemini-2.0-flash", model_provider="google_genai")
embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
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



# Utility to process PDF from URL
def process_pdf_from_url(pdf_url: str):
    doc_to_download = requests.get(pdf_url)
    if doc_to_download.status_code != 200:
        raise HTTPException(status_code=400, detail="Could not download PDF")
    # Use in-memory bytes for PDF
    from io import BytesIO
    pdf_file_obj = BytesIO(doc_to_download.content)
    pdf_reader = PdfReader(pdf_file_obj)
    text = ""
    for page in pdf_reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text
    pdf_file_obj.close()
    return text

# A protected endpoint for LLM answer
class PDFRequest(BaseModel):
    pdf_url: str
    question1: str = """Por favor extrae todos los pasos que debo hacer para completar lo que se plantea en este documento.  Si hay una lista de puntos a hacer, muestra la lista."""


DEFAULT_QUESTION = (
    "Estima el tiempo necesario para cada tarea en dias. Escribe los resultados en formato JSON asi: "
    "{\"tarea_1\": \"*poner tarea aqui*\", \"tiempoEstimado_1\": \"*tiempo estimado*\", "
    "\"tarea_2\": \"*poner tarea aqui*\", \"tiempoEstimado_2\": \"*tiempo estimado*\", "
    "***Continuar patrón 1 vez***} "
)

@app.post("/secure-data")
async def llmAnswer(data: PDFRequest, api_key: str = Depends(get_api_key)):


    if data.pdf_url: #para hablar
        text = process_pdf_from_url(data.pdf_url)
    else:
        text = ""  # Use empty string if no PDF URL provided

    docs = [Document(page_content=text)]
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    all_splits = text_splitter.split_documents(docs)

    vector_store = InMemoryVectorStore(embeddings)
    _ = vector_store.add_documents(documents=all_splits)

    def retrieve(state: State):
        retrieved_docs = vector_store.similarity_search(state["question"])
        return {"context": retrieved_docs}

    def generate(state: State):
        docs_content = "\n\n".join(doc.page_content for doc in state["context"])
        messages = prompt.invoke({"question": state["question"], "context": docs_content})
        response = llm.invoke(messages)
        return {"answer": response.content}

    graph_builder = StateGraph(State).add_sequence([retrieve, generate])
    graph_builder.add_edge(START, "retrieve")
    graph = graph_builder.compile()

    combined_question = data.question1 + " " + DEFAULT_QUESTION
    response = graph.invoke({"question": combined_question})

    return response["answer"]


