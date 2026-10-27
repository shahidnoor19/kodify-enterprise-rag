using Microsoft.AspNetCore.Mvc;
using RagApi.Models;
using RagApi.Services;

namespace RagApi.Controllers;

[ApiController]
[Route("api/images")]
public sealed class ImagesController(ImageKnowledge images, ImageAgent imageAgent, BlobStore blobs) : ControllerBase
{
    private const long MaxBytes = 4 * 1024 * 1024;

    /// <summary>Uploads an image. A vision model describes it, and the description is indexed.</summary>
    [HttpPost]
    public async Task<IActionResult> Upload(IFormFile file, CancellationToken ct)
    {
        var fileName = Path.GetFileName(file.FileName);
        if (!ImageKnowledge.Extensions.Contains(Path.GetExtension(fileName).ToLowerInvariant()))
            return BadRequest("Only .png, .jpg, .jpeg and .webp images are supported.");
        if (file.Length > MaxBytes)
            return BadRequest("The image is larger than 4 MB.");

        using var memory = new MemoryStream();
        await file.CopyToAsync(memory, ct);
        return Ok(await images.IndexAsync(fileName, memory.ToArray(), file.ContentType, ct));
    }

    /// <summary>Returns an image from Blob Storage, so a client can show it.</summary>
    [HttpGet("{fileName}")]
    public async Task<IActionResult> Get(string fileName, CancellationToken ct)
    {
        var blob = await blobs.DownloadAsync(Path.GetFileName(fileName), ct);
        return blob is null ? NotFound() : File(blob.Content, blob.ContentType);
    }

    /// <summary>Asks the image agent. It draws with its tool when the message asks for a picture.</summary>
    [HttpPost("generate")]
    public async Task<ActionResult<GenerateImageResponse>> Generate(GenerateImageRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Prompt) || request.Prompt.Length > 1000)
            return BadRequest("Write a prompt of up to 1000 characters.");

        var response = await imageAgent.Agent.RunAsync(request.Prompt, cancellationToken: ct);
        return new GenerateImageResponse(response.Text);
    }
}
