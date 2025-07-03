import getpass
import os
import bs4
import requests
from langchain import hub
from langchain_community.document_loaders import WebBaseLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langgraph.graph import START, StateGraph
from typing_extensions import List, TypedDict
from langchain.chat_models import init_chat_model
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_core.vectorstores import InMemoryVectorStore
from PyPDF2 import PdfReader
from langchain.embeddings import HuggingFaceEmbeddings
from sentence_transformers import SentenceTransformer
from langchain.vectorstores import FAISS

if not os.environ.get("GOOGLE_API_KEY"):
  os.environ["GOOGLE_API_KEY"] = getpass.getpass("Enter API key for Google Gemini: ")

os.environ["LANGSMITH_TRACING"] = "true"
os.environ["LANGSMITH_API_KEY"] = getpass.getpass()

llm = init_chat_model("gemini-2.0-flash", model_provider="google_genai")

embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")

vector_store = InMemoryVectorStore(embeddings)

URL = "https://preguntapdf.s3.eu-south-2.amazonaws.com/BOE-A-1978-31229-consolidado.pdf"
doc_to_download = requests.get(URL)

pdf_file = open("BOE-A-1978-31229-consolidado.pdf", "wb")
pdf_file.write(doc_to_download.content)

pdf_file_obj = open('BOE-A-1978-31229-consolidado.pdf', 'rb')
pdf_reader = PdfReader(pdf_file_obj)

text = ""
for page in pdf_reader.pages:
    text += page.extract_text()



# Load and chunk contents of the blog
""" loader = WebBaseLoader(
    web_paths=("https://lilianweng.github.io/posts/2023-06-23-agent/",),
    bs_kwargs=dict(
        parse_only=bs4.SoupStrainer(
            class_=("post-content", "post-title", "post-header")
        )
    ),
)
 """



# Docs es un string
#docs = loader.load()
docs = [Document(page_content=text)]

text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
all_splits = text_splitter.split_documents(docs)

#chunks = text_splitter.split_text(text) 

# 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2' # 471M
# 'sentence-transformers/paraphrase-multilingual-mpnet-base-v2' #1.11G



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


response = graph.invoke({"question": """Por favor dime los puntos en negrita del documento. TÍTULO I
De los derechos y deberes fundamentales. Respuesta: De los derechos y deberes fundamentales. TÍTULO II
De la Corona. Respuesta: De la Corona."""})
print(response["answer"])