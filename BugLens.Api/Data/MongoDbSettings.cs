namespace BugLens.Api.Data;

public class MongoDbSettings
{
    public string ConnectionString { get; set; } = default!;
    public string DatabaseName { get; set; } = default!;
}