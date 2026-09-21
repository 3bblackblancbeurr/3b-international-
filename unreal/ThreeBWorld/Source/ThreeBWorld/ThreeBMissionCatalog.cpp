#include "ThreeBMissionCatalog.h"

bool UThreeBMissionCatalog::FindMission(FName Id, FThreeBMissionDefinitionEntry& OutMission) const
{
    for (const FThreeBMissionDefinitionEntry& Mission : Missions)
    {
        if (Mission.Id == Id)
        {
            OutMission = Mission;
            return true;
        }
    }
    return false;
}

bool UThreeBMissionCatalog::ValidateCatalog(TArray<FString>& OutErrors) const
{
    OutErrors.Reset();
    TSet<FName> MissionIds;

    if (CatalogId.IsNone())
    {
        OutErrors.Add(TEXT("CatalogId is required."));
    }

    for (const FThreeBMissionDefinitionEntry& Mission : Missions)
    {
        if (Mission.Id.IsNone())
        {
            OutErrors.Add(TEXT("Mission with empty Id."));
            continue;
        }

        if (MissionIds.Contains(Mission.Id))
        {
            OutErrors.Add(FString::Printf(TEXT("Duplicate mission: %s"), *Mission.Id.ToString()));
        }
        MissionIds.Add(Mission.Id);

        if (Mission.DistrictId.IsNone())
        {
            OutErrors.Add(FString::Printf(TEXT("Mission %s has no district."), *Mission.Id.ToString()));
        }

        if (Mission.Objectives.IsEmpty())
        {
            OutErrors.Add(FString::Printf(TEXT("Mission %s has no objectives."), *Mission.Id.ToString()));
        }

        if (Mission.Authority == EThreeBMissionAuthority::ServerVerified && Mission.RewardPolicyKey.IsNone())
        {
            OutErrors.Add(FString::Printf(TEXT("Server-verified mission %s has no reward policy key."), *Mission.Id.ToString()));
        }
    }

    return OutErrors.IsEmpty();
}
