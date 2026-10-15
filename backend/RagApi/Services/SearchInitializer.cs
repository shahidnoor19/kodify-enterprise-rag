namespace RagApi.Services;

/// <summary>Creates the container and the Azure AI Search objects when the API starts.</summary>
public sealed class SearchInitializer(BlobStore blobs, SearchIndexes indexes, ILogger<SearchInitializer> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await blobs.EnsureContainerAsync(stoppingToken);
        await indexes.EnsureAsync(stoppingToken);
        logger.LogInformation("Azure AI Search is ready: index, data source, skillset and indexer");
    }
}
