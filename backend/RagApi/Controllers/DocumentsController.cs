using Microsoft.AspNetCore.Mvc;
using RagApi.Models;
using RagApi.Services;

namespace RagApi.Controllers;

[ApiController]
[Route("api/documents")]
public sealed class DocumentsController(KnowledgeBaseService knowledgeBase, BlobStore blobs) : ControllerBase
{
    /// <summary>Every document in Blob Storage, with its indexing status.</summary>
    [HttpGet]
    public Task<IReadOnlyList<DocumentInfo>> List(CancellationToken ct) => knowledgeBase.ListAsync(ct);

    /// <summary>Uploads files to Blob Storage. The indexer does the rest.</summary>
    [HttpPost]
    public async Task<IReadOnlyList<UploadResult>> Upload([FromForm] List<IFormFile> files, CancellationToken ct)
    {
        var results = new List<UploadResult>();
        foreach (var file in files)
            results.Add(await knowledgeBase.UploadAsync(file, ct));
        return results;
    }

    // The original file, so a client can open it.
    [HttpGet("{fileName}")]
    public async Task<IActionResult> Download(string fileName, CancellationToken ct)
    {
        var blob = await blobs.DownloadAsync(Path.GetFileName(fileName), ct);
        return blob is null ? NotFound() : File(blob.Content, blob.ContentType);
    }
}
