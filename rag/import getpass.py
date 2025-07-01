import asyncio
from collections.abc import Iterable
from pydantic import BaseModel
from ragbits.core.embeddings import LiteLLMEmbedder
from ragbits.core.llms import LiteLLM
from ragbits.core.prompt import Prompt
from ragbits.core.vector_stores import InMemoryVectorStore
from ragbits.document_search import DocumentSearch
from ragbits.document_search.documents.element import Element

class QuestionAnswerPromptInput(BaseModel):
    question: str
    context: Iterable[Element]

class QuestionAnswerPrompt(Prompt[QuestionAnswerPromptInput, str]):
    system_prompt = """
    You are a question answering agent. Answer the question that will be provided using context.
    If in the given context there is not enough information refuse to answer.
    """
    user_prompt = """
    Question: {{ question }}
    Context: {% for chunk in context %}{{ chunk.text_representation }}{%- endfor %}
    """

llm = LiteLLM(model_name="gemini-2.0-flash")
embedder = LiteLLMEmbedder(model_name="text-embedding-3-small")
vector_store = InMemoryVectorStore(embedder=embedder)
document_search = DocumentSearch(vector_store=vector_store)

async def run() -> None:
    question = "What are the key findings presented in this paper?"

    await document_search.ingest("web://https://arxiv.org/pdf/1706.03762")
    chunks = await document_search.search(question)

    prompt = QuestionAnswerPrompt(QuestionAnswerPromptInput(question=question, context=chunks))
    response = await llm.generate(prompt)
    print(response)

if __name__ == "__main__":
    asyncio.run(run())