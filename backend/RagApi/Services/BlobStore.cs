using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Options;
using RagApi.Options;

namespace RagApi.Services;

/// <summary>Azure Blob Storage, the source of truth for every document.</summary>
public sealed class BlobStore
{
    private readonly BlobContainerClient _documents;

    public BlobStore(IOptions<StorageOptions> options)
    {
        var storage = options.Value;
        if (!storage.IsConfigured)
            throw new InvalidOperationException("Set AzureStorage:ConnectionString (user secrets).");

        _documents = new BlobServiceClient(storage.ConnectionString).GetBlobContainerClient(storage.DocumentsContainer);
    }

    /// <summary>Creates the private documents container, if it doesn't exist yet.</summary>
    public async Task EnsureContainerAsync(CancellationToken ct) =>
        await _documents.CreateIfNotExistsAsync(PublicAccessType.None, cancellationToken: ct);

    /// <summary>Uploads a file. The same name replaces the old version, and the indexer re-indexes it.</summary>
    public async Task UploadAsync(string fileName, Stream content, string contentType, CancellationToken ct)
    {
        await EnsureContainerAsync(ct);
        await _documents.GetBlobClient(fileName).UploadAsync(content, new BlobUploadOptions
        {
            HttpHeaders = new BlobHttpHeaders { ContentType = contentType },
        }, ct);
    }

    public async Task<BlobDownloadInfo?> DownloadAsync(string fileName, CancellationToken ct)
    {
        var blob = _documents.GetBlobClient(fileName);
        if (!await blob.ExistsAsync(ct)) return null;
        return (await blob.DownloadAsync(ct)).Value;
    }

    public async Task<List<BlobItem>> ListAsync(CancellationToken ct)
    {
        var blobs = new List<BlobItem>();
        await foreach (var blob in _documents.GetBlobsAsync(cancellationToken: ct))
            blobs.Add(blob);
        return blobs;
    }
}
