using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;
using OpenAI.Chat;

namespace RagApi.Services;

/// <summary>An agent that can draw: it answers in text, and calls the image tool when the user wants a picture.</summary>
public sealed class ImageAgent(FoundryClients clients, ImageTools tools)
{
    private const string Instructions = """
        You are a creative assistant for the company's marketing team.
        When the user asks for a picture, write a detailed prompt and call the GenerateImage tool.
        Then answer with one short sentence and the image in Markdown, using exactly the link the tool returned, with no spaces: ![description](link)
        If the user does not ask for a picture, just answer.
        """;

    public AIAgent Agent { get; } = clients.ChatClient.AsAIAgent(
        instructions: Instructions,
        name: "ImageAgent",
        tools: [AIFunctionFactory.Create(tools.GenerateImageAsync, "GenerateImage")]);
}
