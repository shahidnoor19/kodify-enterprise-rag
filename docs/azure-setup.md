# Azure setup (Episode 03)

| Resource | Name |
|---|---|
| Resource group | rg-kodify-rag |
| Microsoft Foundry | foundry-kodify-rag (Sweden Central) |
| Default project | proj-default |

Endpoint: https://foundry-kodify-rag.openai.azure.com/

## Model deployments
| Deployment name | Used for |
|---|---|
| gpt-4.1-mini | chat, query rewriting, vision |
| text-embedding-3-small | 1,536-dimension vectors |
| gpt-image-1-mini | image generation |

The API key is never committed to Git.

## Azure AI Search (Episode 04)
| Setting | Value |
|---|---|
| Service | search-kodify-rag (Free tier) |
| Endpoint | https://search-kodify-rag.search.windows.net |
| Indexes | created by our .NET code in episode 6 |

## Azure Blob Storage (Episode 04)
| Setting | Value |
|---|---|
| Storage account | stkodifyrag (Standard, LRS) |
| Containers | documents, images, generated (created by code) |
| Soft delete | on, 7 days (the indexer uses it to detect deleted files) |
