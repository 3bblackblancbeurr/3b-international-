using UnrealBuildTool;
using System.Collections.Generic;

public class ThreeBWorldClientTarget : TargetRules
{
    public ThreeBWorldClientTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Client;
        DefaultBuildSettings = BuildSettingsVersion.Latest;
        IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
        ExtraModuleNames.Add("ThreeBWorld");
    }
}
