using System.ClientModel;
using Microsoft.Extensions.Options;
using OpenAI;
using OpenAI.Chat;
using RagApi.Options;

namespace RagApi.Services;

/// <summary>Creates clients for the models deployed in Microsoft Foundry, through the OpenAI v1 endpoint.</summary>
public sealed class FoundryClients
{
    private readonly FoundryOptions _options;
    private readonly OpenAIClient _client;

    public FoundryClients(IOptions<FoundryOptions> options)
    {
        _options = options.Value;
        if (!_options.IsConfigured)
            throw new InvalidOperationException("Set AzureFoundry:Endpoint and AzureFoundry:ApiKey (user secrets).");

        // https://<resource>.openai.azure.com/openai/v1/
        var endpoint = new Uri(new Uri(_options.Endpoint), "/openai/v1/");
        _client = new OpenAIClient(new ApiKeyCredential(_options.ApiKey), new OpenAIClientOptions { Endpoint = endpoint });
    }

    public ChatClient ChatClient => _client.GetChatClient(_options.ChatDeployment);
}
