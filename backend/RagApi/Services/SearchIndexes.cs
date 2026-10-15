using Azure;
using Azure.Search.Documents;
using Azure.Search.Documents.Indexes;
using Microsoft.Extensions.Options;
using RagApi.Options;

namespace RagApi.Services;

/// <summary>Creates everything Azure AI Search needs, as code: the index and the indexer pipeline.</summary>
public sealed partial class SearchIndexes
{
    public const string DataSourceName = "rag-docs-blob";
    public const string SkillsetName = "rag-docs-skillset";
    public const string IndexerName = "rag-docs-indexer";
    public static readonly string[] SupportedExtensions = [".pdf", ".docx", ".pptx", ".txt", ".md"];

    private readonly SearchServiceOptions _search;
    private readonly FoundryOptions _foundry;
    private readonly StorageOptions _storage;
    private readonly RagOptions _rag;
    private readonly SearchIndexClient _indexClient;

    public SearchIndexes(IOptions<SearchServiceOptions> search, IOptions<FoundryOptions> foundry,
        IOptions<StorageOptions> storage, IOptions<RagOptions> rag)
    {
        _search = search.Value;
        _foundry = foundry.Value;
        _storage = storage.Value;
        _rag = rag.Value;
        if (!_search.IsConfigured)
            throw new InvalidOperationException("Set AzureAISearch:Endpoint and AzureAISearch:ApiKey (user secrets).");

        var credential = new AzureKeyCredential(_search.ApiKey);
        _indexClient = new SearchIndexClient(new Uri(_search.Endpoint), credential);
        Indexer = new SearchIndexerClient(new Uri(_search.Endpoint), credential);
    }

    public SearchClient Knowledge => _indexClient.GetSearchClient(_search.KnowledgeIndexName);
    public SearchIndexerClient Indexer { get; }

    /// <summary>Creates or updates the index, the data source, the skillset and the indexer.</summary>
    public async Task EnsureAsync(CancellationToken ct)
    {
        await _indexClient.CreateOrUpdateIndexAsync(BuildKnowledgeIndex(), cancellationToken: ct);
        await Indexer.CreateOrUpdateDataSourceConnectionAsync(BuildDataSource(), cancellationToken: ct);
        await Indexer.CreateOrUpdateSkillsetAsync(BuildSkillset(), cancellationToken: ct);
        await Indexer.CreateOrUpdateIndexerAsync(BuildIndexer(), cancellationToken: ct);
    }

    /// <summary>Runs the indexer now, instead of waiting for its schedule.</summary>
    public async Task RunIndexerAsync(CancellationToken ct)
    {
        try { await Indexer.RunIndexerAsync(IndexerName, ct); }
        catch (RequestFailedException ex) when (ex.Status is 409 or 429)
        {
            // 409: already running. 429: too many on-demand runs on the Free tier. The schedule picks it up.
        }
    }

    // https://foundry-kodify-rag.openai.azure.com, for the embedding skill and the vectorizer
    private Uri FoundryResourceUri => new(new Uri(_foundry.Endpoint).GetLeftPart(UriPartial.Authority));
}
