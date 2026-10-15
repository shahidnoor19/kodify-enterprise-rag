using Azure.Search.Documents;
using RagApi.Models;

namespace RagApi.Services;

/// <summary>Uploads documents to Blob Storage, and reports their indexing status.</summary>
public sealed class KnowledgeBaseService(BlobStore blobs, SearchIndexes indexes, ILogger<KnowledgeBaseService> logger)
{
    public async Task<UploadResult> UploadAsync(IFormFile file, CancellationToken ct)
    {
        var fileName = Path.GetFileName(file.FileName);
        if (!SearchIndexes.SupportedExtensions.Contains(Path.GetExtension(fileName).ToLowerInvariant()))
            return new UploadResult(fileName, file.Length, "rejected", "Unsupported file type.");

        await using var stream = file.OpenReadStream();
        await blobs.UploadAsync(fileName, stream, file.ContentType, ct);

        // Don't wait for the schedule: ask the indexer to run now.
        await indexes.RunIndexerAsync(ct);
        logger.LogInformation("Uploaded {FileName}, indexer started", fileName);
        return new UploadResult(fileName, file.Length, "processing");
    }

    public async Task<IReadOnlyList<DocumentInfo>> ListAsync(CancellationToken ct)
    {
        // Chunks per file, straight from the index, with one facet query.
        var options = new SearchOptions { Size = 0, Facets = { "fileName,count:1000" } };
        var response = await indexes.Knowledge.SearchAsync<KnowledgeChunk>("*", options, ct);
        var chunks = new Dictionary<string, int>();
        if (response.Value.Facets.TryGetValue("fileName", out var facets))
            foreach (var facet in facets) chunks[facet.Value.ToString()!] = (int)(facet.Count ?? 0);

        var files = await blobs.ListAsync(ct);
        return files.Select(blob =>
        {
            var count = chunks.GetValueOrDefault(blob.Name);
            return new DocumentInfo(blob.Name, blob.Properties.ContentLength ?? 0,
                blob.Properties.LastModified ?? DateTimeOffset.MinValue, count, count > 0 ? "indexed" : "processing");
        }).ToList();
    }
}
