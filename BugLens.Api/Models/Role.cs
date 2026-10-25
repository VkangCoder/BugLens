namespace BugLens.Api.Models;

public static class Roles
{
    public const string Admin = "Admin";
    public const string Dev = "Dev";

    public static readonly string[] All = [Admin, Dev];
}