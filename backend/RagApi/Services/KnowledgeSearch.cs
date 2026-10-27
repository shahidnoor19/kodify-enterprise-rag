using Azure;
using Azure.Search.Documents;
using Azure.Search.Documents.Models;
using Microsoft.Extensions.Options;
using RagApi.Models;
using RagApi.Options;

namespace RagApi.Services;

/// <summary>Searches the knowledge index: keyword, vector, hybrid, and hybrid with the semantic ranker.</summary>
public sealed class KnowledgeSearch
{
    private readonly SearchClient _client;

    public KnowledgeSearch(IOptions<SearchServiceOptions> options)
    {
        var search = options.Value;
        _client = new SearchClient(new Uri(search.Endpoint), search.KnowledgeIndexName, new AzureKeyCredential(search.ApiKey));
    }

    public async Task<IReadOnlyList<SearchHit>> SearchAsync(string query, RetrievalMode mode, int top, CancellationToken ct, string? filter = null)
    {
        var options = new SearchOptions { Size = top, Select = { "fileName", "content" } };
        options.Filter = filter;

        // Vector and hybrid: the vectorizer in the index embeds the question for us.
        if (mode != RetrievalMode.Keyword)
        {
            options.VectorSearch = new VectorSearchOptions
            {
                Queries = { new VectorizableTextQuery(query) { KNearestNeighborsCount = 50, Fields = { "contentVector" } } },
            };
        }

        // Semantic: the ranker re-orders the hybrid results.
        if (mode == RetrievalMode.Semantic)
        {
            options.QueryType = SearchQueryType.Semantic;
            options.SemanticSearch = new SemanticSearchOptions { SemanticConfigurationName = SearchIndexes.SemanticConfigName };
        }

        // Vector only: no text query, so there is no keyword (BM25) part.
        var text = mode == RetrievalMode.Vector ? null : query;
        var response = await _client.SearchAsync<SearchDocument>(text, options, ct);

        var hits = new List<SearchHit>();
        await foreach (var result in response.Value.GetResultsAsync().WithCancellation(ct))
        {
            hits.Add(new SearchHit(
                result.Document.GetString("fileName"),
                result.Score ?? 0,
                result.SemanticSearch?.RerankerScore,
                result.Document.GetString("content")));
        }
        return hits;
    }
}
