namespace RagApi.Models;

// One earlier message of the conversation: its role, user or assistant, and its text.
public sealed record ChatTurn(string Role, string Text);

public sealed record ChatRequest(string Message, IReadOnlyList<ChatTurn>? History = null);

public sealed record ChatResponse(string Answer);
