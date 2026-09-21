#include "ThreeBMissionSubsystem.h"

void UThreeBMissionSubsystem::SetMissionCatalog(UThreeBMissionCatalog* InCatalog)
{
    MissionCatalog = InCatalog;
}

bool UThreeBMissionSubsystem::IsMissionAvailable(
    FName MissionId,
    FName CurrentPhaseId,
    FName CurrentWorldStateId
) const
{
    if (!MissionCatalog || MissionId.IsNone())
    {
        return false;
    }

    FThreeBMissionDefinitionEntry Mission;
    if (!MissionCatalog->FindMission(MissionId, Mission))
    {
        return false;
    }

    if (!Mission.AvailablePhaseIds.IsEmpty()
        && !Mission.AvailablePhaseIds.Contains(CurrentPhaseId))
    {
        return false;
    }

    if (!Mission.RequiredWorldStateIds.IsEmpty()
        && !Mission.RequiredWorldStateIds.Contains(CurrentWorldStateId))
    {
        return false;
    }

    return true;
}

TArray<FName> UThreeBMissionSubsystem::GetAvailableMissionIds(
    FName CurrentPhaseId,
    FName CurrentWorldStateId
) const
{
    TArray<FName> Result;
    if (!MissionCatalog)
    {
        return Result;
    }

    Result.Reserve(MissionCatalog->Missions.Num());
    for (const FThreeBMissionDefinitionEntry& Mission : MissionCatalog->Missions)
    {
        if (IsMissionAvailable(Mission.Id, CurrentPhaseId, CurrentWorldStateId))
        {
            Result.Add(Mission.Id);
        }
    }
    return Result;
}
