using RagApi.Options;
using RagApi.Services;

var builder = WebApplication.CreateBuilder(args);

// Configuration: appsettings.json, and user secrets for the keys
builder.Services.Configure<FoundryOptions>(builder.Configuration.GetSection(FoundryOptions.Section));

// AI services
builder.Services.AddSingleton<FoundryClients>();
builder.Services.AddSingleton<RagAgents>();

builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapControllers();

app.Run();
