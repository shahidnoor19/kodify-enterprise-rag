# RAG concepts (Episode 02)

RAG = Retrieve, Augment, Generate.

## Ingestion (once per document)
1. Upload the file to Azure Blob Storage
2. Extract the text
3. Chunk it: 1,600 characters with a 250-character overlap
4. Embed every chunk: text-embedding-3-small, 1,536 dimensions
5. Store the chunks and vectors in Azure AI Search

## Question answering (every message)
1. Rewrite follow-up questions into a standalone query
2. Hybrid search: BM25 keywords + HNSW vectors, merged with RRF
3. The semantic ranker re-ranks the top results
4. Grounded prompt with numbered sources
5. Stream the answer with Server-Sent Events, with citations [1] [2]
