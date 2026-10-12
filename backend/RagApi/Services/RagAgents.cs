using Microsoft.Agents.AI;
using OpenAI.Chat;

namespace RagApi.Services;

/// <summary>Our AI agents, built with the Microsoft Agent Framework.</summary>
public sealed class RagAgents
{
    private const string GeneralInstructions = """
        You are a helpful, precise enterprise assistant.
        Answer clearly and concisely, and use Markdown when it helps.
        If you are unsure, say so instead of guessing.
        """;

    public RagAgents(FoundryClients clients)
    {
        General = clients.ChatClient.AsAIAgent(instructions: GeneralInstructions, name: "GeneralAssistant");
    }

    public AIAgent General { get; }
}
