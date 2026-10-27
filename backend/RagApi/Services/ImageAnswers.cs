using System.Runtime.CompilerServices;
using OpenAI.Chat;
using RagApi.Models;

namespace RagApi.Services;

public sealed record FoundImage(string FileName, string Caption, BinaryData Bytes, string ContentType);

// Image mode: find the best image in the index, show it to the vision model, and stream the answer.
public sealed class ImageAnswers(KnowledgeSearch search, BlobStore blobs, FoundryClients clients)
{
    private const double MinRerankerScore = 1.0;

    private const string Instructions = """
        You answer questions about an image from the company's image library.
        Look at the image, and answer only from what you can see, including the text and the numbers.
        Cite the image as [1]. If the image does not answer the question, say so.
        """;

    public async Task<FoundImage?> FindAsync(string question, CancellationToken ct)
    {
        var hits = await search.SearchAsync(question, RetrievalMode.Semantic, 1, ct, filter: "isImage eq true");
        var hit = hits.FirstOrDefault(h => h.RerankerScore >= MinRerankerScore);
        if (hit is null) return null;

        var blob = await blobs.DownloadAsync(hit.FileName, ct);
        if (blob is null) return null;
        return new FoundImage(hit.FileName, hit.Content, await BinaryData.FromStreamAsync(blob.Content, ct), blob.ContentType);
    }

    public async IAsyncEnumerable<string> AnswerAsync(string question, FoundImage image, [EnumeratorCancellation] CancellationToken ct)
    {
        var message = new UserChatMessage(
            ChatMessageContentPart.CreateTextPart(question),
            ChatMessageContentPart.CreateImagePart(image.Bytes, image.ContentType));
        var messages = new ChatMessage[] { new SystemChatMessage(Instructions), message };

        await foreach (var update in clients.ChatClient.CompleteChatStreamingAsync(messages, cancellationToken: ct))
            foreach (var part in update.ContentUpdate)
                yield return part.Text;
    }
}
