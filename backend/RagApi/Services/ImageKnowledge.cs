using System.Text;
using Azure.Search.Documents;
using Azure.Search.Documents.Models;
using Microsoft.AspNetCore.WebUtilities;
using OpenAI.Chat;
using RagApi.Models;

namespace RagApi.Services;

/// <summary>Image RAG: a vision model describes each image, and the description is indexed like any other chunk.</summary>
public sealed class ImageKnowledge(FoundryClients clients, BlobStore blobs, SearchIndexes indexes)
{
    public static readonly string[] Extensions = [".png", ".jpg", ".jpeg", ".webp"];

    private const string CaptionPrompt = """
        You describe images for a company search index.
        In three to five sentences, say what the image shows. Copy any visible text exactly, and include numbers, labels and colors.
        Plain text only, no Markdown.
        """;

    public async Task<ImageResult> IndexAsync(string fileName, byte[] bytes, string contentType, CancellationToken ct)
    {
        // 1. The original file goes to Blob Storage, next to the documents.
        await blobs.UploadAsync(fileName, new MemoryStream(bytes), contentType, ct);

        // 2. The vision model turns the picture into text.
        var caption = await DescribeAsync(bytes, contentType, ct);

        // 3. The text is embedded, and stored as one chunk of the knowledge index.
        var embedding = await clients.EmbeddingClient.GenerateEmbeddingAsync(caption, cancellationToken: ct);
        var chunk = new SearchDocument
        {
            ["id"] = "image-" + WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(fileName)),
            ["parentKey"] = fileName,
            ["fileName"] = fileName,
            ["content"] = caption,
            ["contentVector"] = embedding.Value.ToFloats().ToArray(),
            ["fileSizeBytes"] = (long)bytes.Length,
            ["uploadedAt"] = DateTimeOffset.UtcNow,
            ["isImage"] = true,
        };
        await indexes.Knowledge.MergeOrUploadDocumentsAsync([chunk], cancellationToken: ct);
        return new ImageResult(fileName, caption);
    }

    private async Task<string> DescribeAsync(byte[] bytes, string contentType, CancellationToken ct)
    {
        var message = new UserChatMessage(
            ChatMessageContentPart.CreateTextPart("Describe this image."),
            ChatMessageContentPart.CreateImagePart(BinaryData.FromBytes(bytes), contentType));
        var result = await clients.ChatClient.CompleteChatAsync([new SystemChatMessage(CaptionPrompt), message], cancellationToken: ct);
        return result.Value.Content[0].Text;
    }
}
