using System.ComponentModel;
using OpenAI.Images;

namespace RagApi.Services;

/// <summary>The tools the image agent can call. The model decides when, from the descriptions.</summary>
public sealed class ImageTools(FoundryClients clients, ImageKnowledge images)
{
    [Description("Creates a new image from a detailed description. Returns the link of the image.")]
    public async Task<string> GenerateImageAsync(
        [Description("A detailed English description: subject, style, colors, composition.")] string prompt)
    {
        var options = new ImageGenerationOptions { Size = GeneratedImageSize.W1024xH1024 };
        GeneratedImage image = await clients.ImageClient.GenerateImageAsync(prompt, options);

        // Keep it: stored in Blob Storage, described and searchable like an uploaded image.
        var fileName = $"generated-{Guid.NewGuid():N}.png";
        await images.IndexAsync(fileName, image.ImageBytes.ToArray(), "image/png", CancellationToken.None);
        return $"/api/images/{fileName}";
    }
}
