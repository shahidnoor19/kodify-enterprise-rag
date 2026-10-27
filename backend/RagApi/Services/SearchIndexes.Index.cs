using Azure.Search.Documents.Indexes.Models;

namespace RagApi.Services;

public sealed partial class SearchIndexes
{
    private const string VectorProfile = "vector-profile";
    private const string Vectorizer = "foundry-vectorizer";
    public const string SemanticConfigName = "default-semantic";

    /// <summary>The knowledge index: one search document per chunk.</summary>
    private SearchIndex BuildKnowledgeIndex() => new(_search.KnowledgeIndexName)
    {
        Fields =
        {
            // Index projections need a searchable key with the keyword analyzer.
            new SearchableField("id") { IsKey = true, IsFilterable = true, AnalyzerName = LexicalAnalyzerName.Keyword },
            new SimpleField("parentKey", SearchFieldDataType.String) { IsFilterable = true },
            new SearchableField("fileName") { IsFilterable = true, IsFacetable = true },
            new SearchableField("content") { AnalyzerName = LexicalAnalyzerName.EnMicrosoft },
            new SearchField("contentVector", SearchFieldDataType.Collection(SearchFieldDataType.Single))
            {
                IsSearchable = true,
                VectorSearchDimensions = _foundry.EmbeddingDimensions,
                VectorSearchProfileName = VectorProfile,
            },
            new SimpleField("fileSizeBytes", SearchFieldDataType.Int64),
            new SimpleField("uploadedAt", SearchFieldDataType.DateTimeOffset) { IsSortable = true },
            new SimpleField("isImage", SearchFieldDataType.Boolean) { IsFilterable = true },
        },
        VectorSearch = new VectorSearch
        {
            Algorithms = { new HnswAlgorithmConfiguration("hnsw") },
            // The vectorizer embeds the user's question at query time, with the same model.
            Vectorizers = { new AzureOpenAIVectorizer(Vectorizer) { Parameters = EmbeddingParameters() } },
            Profiles = { new VectorSearchProfile(VectorProfile, "hnsw") { VectorizerName = Vectorizer } },
        },
        // The semantic ranker re-orders the best results with a language model.
        SemanticSearch = new SemanticSearch
        {
            Configurations =
            {
                new SemanticConfiguration(SemanticConfigName, new SemanticPrioritizedFields
                {
                    TitleField = new SemanticField("fileName"),
                    ContentFields = { new SemanticField("content") },
                }),
            },
        },
    };

    private AzureOpenAIVectorizerParameters EmbeddingParameters() => new()
    {
        ResourceUri = FoundryResourceUri,
        DeploymentName = _foundry.EmbeddingDeployment,
        ModelName = new AzureOpenAIModelName(_foundry.EmbeddingModel),
        ApiKey = _foundry.ApiKey,
    };
}
