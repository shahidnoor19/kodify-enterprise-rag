using Azure.Search.Documents.Indexes.Models;

namespace RagApi.Services;

public sealed partial class SearchIndexes
{
    private const string Chunks = "/document/pages/*";

    /// <summary>Splits the extracted text into overlapping chunks, then embeds every chunk.</summary>
    private SearchIndexerSkillset BuildSkillset()
    {
        var split = new SplitSkill(
            [new InputFieldMappingEntry("text") { Source = "/document/content" }],
            [new OutputFieldMappingEntry("textItems") { TargetName = "pages" }])
        {
            Name = "split",
            Context = "/document",
            TextSplitMode = TextSplitMode.Pages,
            MaximumPageLength = _rag.ChunkSize,
            PageOverlapLength = _rag.ChunkOverlap,
        };

        var embed = new AzureOpenAIEmbeddingSkill(
            [new InputFieldMappingEntry("text") { Source = Chunks }],
            [new OutputFieldMappingEntry("embedding") { TargetName = "vector" }])
        {
            Name = "embed",
            Context = Chunks,
            ResourceUri = FoundryResourceUri,
            DeploymentName = _foundry.EmbeddingDeployment,
            ModelName = new AzureOpenAIModelName(_foundry.EmbeddingModel),
            Dimensions = _foundry.EmbeddingDimensions,
            ApiKey = _foundry.ApiKey,
        };

        return new SearchIndexerSkillset(SkillsetName, [split, embed])
        {
            // Index projections: one search document per chunk, linked to its file by parentKey.
            IndexProjection = new SearchIndexerIndexProjection(
            [
                new SearchIndexerIndexProjectionSelector(_search.KnowledgeIndexName, "parentKey", Chunks,
                [
                    new InputFieldMappingEntry("content") { Source = Chunks },
                    new InputFieldMappingEntry("contentVector") { Source = $"{Chunks}/vector" },
                    new InputFieldMappingEntry("fileName") { Source = "/document/metadata_storage_name" },
                    new InputFieldMappingEntry("fileSizeBytes") { Source = "/document/metadata_storage_size" },
                    new InputFieldMappingEntry("uploadedAt") { Source = "/document/metadata_storage_last_modified" },
                ]),
            ])
            {
                Parameters = new SearchIndexerIndexProjectionsParameters
                {
                    ProjectionMode = IndexProjectionMode.SkipIndexingParentDocuments,
                },
            },
        };
    }
}
