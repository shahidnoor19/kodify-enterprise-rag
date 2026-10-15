namespace RagApi.Options;

/// <summary>Azure AI Search: the endpoint, the admin key and our index name.</summary>
public sealed class SearchServiceOptions
{
    public const string Section = "AzureAISearch";

    public string Endpoint { get; set; } = "";
    public string ApiKey { get; set; } = "";
    public string KnowledgeIndexName { get; set; } = "rag-knowledge";

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(Endpoint) && !string.IsNullOrWhiteSpace(ApiKey) && !ApiKey.StartsWith('<');
}

/// <summary>Azure Blob Storage: the source of truth for every document.</summary>
public sealed class StorageOptions
{
    public const string Section = "AzureStorage";

    public string ConnectionString { get; set; } = "";
    public string DocumentsContainer { get; set; } = "documents";

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(ConnectionString) && !ConnectionString.StartsWith('<');
}

/// <summary>Chunking, done by the Split skill in the indexer.</summary>
public sealed class RagOptions
{
    public const string Section = "Rag";

    public int ChunkSize { get; set; } = 1600;
    public int ChunkOverlap { get; set; } = 250;
}
