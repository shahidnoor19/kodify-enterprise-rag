namespace RagApi.Options;

/// <summary>Settings for the models we deployed in Microsoft Foundry.</summary>
public sealed class FoundryOptions
{
    public const string Section = "AzureFoundry";

    public string Endpoint { get; set; } = "";
    public string ApiKey { get; set; } = "";
    public string ChatDeployment { get; set; } = "gpt-4.1-mini";
    public string EmbeddingDeployment { get; set; } = "text-embedding-3-small";
    public string EmbeddingModel { get; set; } = "text-embedding-3-small";
    public int EmbeddingDimensions { get; set; } = 1536;
    public string ImageDeployment { get; set; } = "gpt-image-1-mini";

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(Endpoint) && !string.IsNullOrWhiteSpace(ApiKey) && !ApiKey.StartsWith('<');
}
