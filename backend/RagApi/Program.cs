using RagApi.Options;
using RagApi.Services;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Configuration: appsettings.json, and user secrets for the keys
builder.Services.Configure<FoundryOptions>(builder.Configuration.GetSection(FoundryOptions.Section));
builder.Services.Configure<SearchServiceOptions>(builder.Configuration.GetSection(SearchServiceOptions.Section));
builder.Services.Configure<StorageOptions>(builder.Configuration.GetSection(StorageOptions.Section));
builder.Services.Configure<RagOptions>(builder.Configuration.GetSection(RagOptions.Section));

// AI services
builder.Services.AddSingleton<FoundryClients>();
builder.Services.AddSingleton<RagAgents>();

// Knowledge ingestion: Blob Storage + the Azure AI Search indexer pipeline
builder.Services.AddSingleton<BlobStore>();
builder.Services.AddSingleton<SearchIndexes>();
builder.Services.AddSingleton<KnowledgeBaseService>();
builder.Services.AddHostedService<SearchInitializer>();

// Retrieval and answers
builder.Services.AddSingleton<KnowledgeSearch>();
builder.Services.AddSingleton<AnswerService>();

// Images
builder.Services.AddSingleton<ImageKnowledge>();
builder.Services.AddSingleton<ImageTools>();
builder.Services.AddSingleton<ImageAgent>();
builder.Services.AddSingleton<ImageAnswers>();

builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.MapControllers();

app.Run();
