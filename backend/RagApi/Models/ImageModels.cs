namespace RagApi.Models;

/// <summary>An image that is now searchable: its file name and the description the vision model wrote.</summary>
public sealed record ImageResult(string FileName, string Caption);

public sealed record GenerateImageRequest(string Prompt);

/// <summary>The agent's reply. When it drew something, the reply contains the image link.</summary>
public sealed record GenerateImageResponse(string Reply);
