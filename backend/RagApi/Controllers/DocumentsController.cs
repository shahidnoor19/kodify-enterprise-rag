using Microsoft.AspNetCore.Mvc;
using RagApi.Models;
using RagApi.Services;

namespace RagApi.Controllers;

[ApiController]
[Route("api/documents")]
public sealed class DocumentsController(KnowledgeBaseService knowledgeBase) : ControllerBase
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
}
