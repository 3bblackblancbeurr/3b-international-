using UnrealBuildTool;
using System.Collections.Generic;

public class ThreeBWorldEditorTarget : TargetRules
{
    public ThreeBWorldEditorTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Editor;
        DefaultBuildSettings = BuildSettingsVersion.Latest;
        ExtraModuleNames.Add("ThreeBWorld");
    }
}
