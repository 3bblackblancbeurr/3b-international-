using UnrealBuildTool;
using System.Collections.Generic;

public class ThreeBWorldTarget : TargetRules
{
    public ThreeBWorldTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Game;
        DefaultBuildSettings = BuildSettingsVersion.Latest;
        ExtraModuleNames.Add("ThreeBWorld");
    }
}
