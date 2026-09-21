using UnrealBuildTool;
using System.Collections.Generic;

public class ThreeBWorldServerTarget : TargetRules
{
    public ThreeBWorldServerTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Server;
        DefaultBuildSettings = BuildSettingsVersion.Latest;
        IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
        ExtraModuleNames.Add("ThreeBWorld");
    }
}
