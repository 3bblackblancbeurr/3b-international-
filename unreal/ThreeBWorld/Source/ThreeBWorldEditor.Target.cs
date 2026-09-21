using UnrealBuildTool;
using System.Collections.Generic;

public class ThreeBWorldEditorTarget : TargetRules
{
    public ThreeBWorldEditorTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Editor;
        DefaultBuildSettings = BuildSettingsVersion.V6;
        IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
        ExtraModuleNames.Add("ThreeBWorld");
    }
}
