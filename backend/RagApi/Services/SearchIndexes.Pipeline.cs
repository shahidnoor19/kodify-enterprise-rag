using Azure.Search.Documents.Indexes.Models;

namespace RagApi.Services;

public sealed partial class SearchIndexes
{
    /// <summary>Where the indexer reads from: the documents container in Blob Storage.</summary>
    private SearchIndexerDataSourceConnection BuildDataSource() =>
        new(DataSourceName, SearchIndexerDataSourceType.AzureBlob, _storage.ConnectionString,
            new SearchIndexerDataContainer(_storage.DocumentsContainer))
        {
            // Soft delete is on, so deleted files are removed from the index on the next run.
            DataDeletionDetectionPolicy = new NativeBlobSoftDeleteDeletionDetectionPolicy(),
        };

    /// <summary>Connects everything: data source, skillset and index. Runs every five minutes.</summary>
    private SearchIndexer BuildIndexer() => new(IndexerName, DataSourceName, _search.KnowledgeIndexName)
    {
        SkillsetName = SkillsetName,
        Schedule = new IndexingSchedule(TimeSpan.FromMinutes(5)),
        Parameters = new IndexingParameters
        {
            IndexingParametersConfiguration = new IndexingParametersConfiguration
            {
                IndexedFileNameExtensions = string.Join(",", SupportedExtensions),
                DataToExtract = BlobIndexerDataToExtract.ContentAndMetadata,
                FailOnUnsupportedContentType = false,
                FailOnUnprocessableDocument = false,
            },
        },
    };
}
