namespace RagApi.Models;

/// <summary>How we search the knowledge index.</summary>
public enum RetrievalMode
{
    Keyword,
    Vector,
    Hybrid,
    Semantic,
}

/// <summary>One chunk found by the search, with its scores.</summary>
public sealed record SearchHit(string FileName, double Score, double? RerankerScore, string Content);

/// <summary>A source of the answer: the number the model cites, the file and a short snippet.</summary>
public sealed record Citation(int Number, string FileName, string Snippet);

public sealed record AskResponse(string Answer, IReadOnlyList<Citation> Citations);
