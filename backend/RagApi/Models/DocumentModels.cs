using System.Text.Json.Serialization;

namespace RagApi.Models;

/// <summary>One chunk of a document, as the indexer writes it into the index.</summary>
public sealed class KnowledgeChunk
{
    [JsonPropertyName("id")] public string Id { get; set; } = "";
    [JsonPropertyName("fileName")] public string FileName { get; set; } = "";
    [JsonPropertyName("content")] public string Content { get; set; } = "";
}

/// <summary>A document in Blob Storage, with its status: processing or indexed.</summary>
public sealed record DocumentInfo(string FileName, long SizeBytes, DateTimeOffset UploadedAt, int Chunks, string Status);

public sealed record UploadResult(string FileName, long SizeBytes, string Status, string? Error = null);
