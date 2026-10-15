using RagApi.Options;
using RagApi.Services;

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

builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapControllers();

app.Run();
